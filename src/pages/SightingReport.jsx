import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createNotification } from "../utils/notifications";
import "./SightingReport.css";

const speciesOptions = [
  "Komodo Dragon",
  "Sumatran Tiger",
  "Javan Rhino",
  "Other",
];

const contributionTypes = [
  { value: "Sighting Report", label: "🔍 Sighting Report" },
  { value: "Conservation Effort", label: "🌱 Conservation Effort" },
  { value: "Field Notes", label: "📋 Field Notes" },
];

export default function SightingReport() {
  const { user, schoolId } = useAuth();
  const navigate = useNavigate();
  const [contributionType, setContributionType] = useState("Sighting Report");
  const [species, setSpecies] = useState("Komodo Dragon");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    try {
      const q = query(
        collection(db, "contributions"),
        where("studentId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSubmit = async () => {
    if (contributionType === "Sighting Report") {
      if (!species || !location.trim() || !date || !description.trim()) {
        setMessage("Please fill in all required fields (Species, Location, Date, Description).");
        setMessageType("error");
        return;
      }
    } else {
      if (!title.trim() || !description.trim()) {
        setMessage("Please fill in Title and Description.");
        setMessageType("error");
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      let photoURL = imageUrl.trim() || "";

      if (photo) {
        const fileRef = ref(storage, `sightings/${user.uid}/${Date.now()}_${photo.name}`);
        await uploadBytes(fileRef, photo);
        photoURL = await getDownloadURL(fileRef);
      }

      const reportTitle = title.trim() || 
        (contributionType === "Sighting Report" 
          ? `${species} Sighting - ${location.trim()}`
          : `${contributionType} - ${new Date().toLocaleDateString()}`);

      const contributionData = {
        studentId: user.uid,
        studentEmail: user.email,
        schoolId: schoolId || null,
        title: reportTitle,
        type: contributionType,
        species: contributionType === "Sighting Report" ? species : "",
        location: location.trim(),
        date,
        time,
        description: description.trim(),
        photoURL,
        status: "pending",
        feedback: [], // Initialize empty feedback array for teacher comments
        isPublic: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "contributions"), contributionData);

      // Also add to sightings collection for backward compat (only for sighting reports)
      if (contributionType === "Sighting Report") {
        await addDoc(collection(db, "sightings"), {
          userId: user.uid,
          userEmail: user.email,
          species,
          location: location.trim(),
          date,
          time,
          description: description.trim(),
          photoURL,
          status: "pending",
          teacherNote: "",
          createdAt: serverTimestamp(),
        });
      }

      // Notify teachers
      if (schoolId) {
        const teacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const teacherSnap = await getDocs(teacherQ);
        teacherSnap.docs.forEach((t) => {
          createNotification(
            t.id, 
            `New ${contributionType}: ${reportTitle}`
          );
        });
      }

      setMessage(`${contributionType} submitted successfully!`);
      setMessageType("success");
      setSpecies("Komodo Dragon");
      setLocation("");
      setDate("");
      setTime("");
      setDescription("");
      setTitle("");
      setImageUrl("");
      setPhoto(null);

      fetchReports();
    } catch (err) {
      console.error("Error submitting report:", err);
      setMessage("Failed to submit. Please try again.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "approved") return "status-approved";
    if (status === "reviewed") return "status-reviewed";
    return "status-pending";
  };

  const formatFeedbackTime = (timestamp) => {
    if (!timestamp?.seconds) return "";
    return new Date(timestamp.seconds * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="sighting-page">
      <div className="sighting-form-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button
            className="sighting-back-btn"
            onClick={() => navigate("/student")}
            title="Back to Dashboard"
          >
            Back
          </button>
          <h3 style={{ margin: 0 }}>Upload Conservation Work</h3>
        </div>
        <p className="sighting-form-note">
          Share your conservation efforts, wildlife sightings, and field observations. 
          Please do NOT share exact GPS coordinates or specific locations publicly.
        </p>

        {message && (
          <div className={`sighting-message ${messageType === "success" ? "sighting-message-success" : "sighting-message-error"}`}>
            {message}
          </div>
        )}

        {/* Contribution type selector */}
        <div className="contribution-type-selector">
          {contributionTypes.map((ct) => (
            <button
              key={ct.value}
              className={`contribution-type-btn ${contributionType === ct.value ? "contribution-type-active" : ""}`}
              onClick={() => setContributionType(ct.value)}
            >
              {ct.label}
            </button>
          ))}
        </div>

        <div className="form-group full-width">
          <label>Title {contributionType !== "Sighting Report" ? "*" : "(optional)"}</label>
          <input
            type="text"
            placeholder={
              contributionType === "Sighting Report"
                ? "e.g. Komodo Dragon spotted near river"
                : contributionType === "Conservation Effort"
                ? "e.g. Beach cleanup at Komodo Island"
                : "e.g. Observations from field trip"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {contributionType === "Sighting Report" && (
          <div className="sighting-form-grid">
            <div className="form-group">
              <label>Species *</label>
              <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>General Location *</label>
              <input
                type="text"
                placeholder="e.g. Near Rinca Island coast"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              {!location.trim() && <span className="field-hint">Required</span>}
            </div>

            <div className="form-group">
              <label>Date of Sighting *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {!date && <span className="field-hint">Required</span>}
            </div>

            <div className="form-group">
              <label>Time of Sighting</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {contributionType !== "Sighting Report" && (
          <div className="sighting-form-grid">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. Komodo National Park"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="form-group full-width">
          <label>Description *</label>
          <textarea
            placeholder={
              contributionType === "Sighting Report"
                ? "Describe what you observed: animal behavior, habitat conditions, number of animals seen..."
                : contributionType === "Conservation Effort"
                ? "Describe your conservation activity: what you did, who participated, outcomes..."
                : "Write your field notes and observations..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {!description.trim() && <span className="field-hint">Required</span>}
        </div>

        <div className="form-group full-width">
          <label>Image URL (optional)</label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="form-group full-width">
          <label>Or upload a photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0] || null)}
            className="file-input"
          />
          {photo && <span className="file-name">{photo.name}</span>}
        </div>

        <button
          className="sighting-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
          title="Submit your work for teacher review"
        >
          {submitting ? "Submitting..." : "Upload Work"}
        </button>
      </div>

      <div className="sighting-history-card">
        <h3>My Past Submissions</h3>

        {loadingReports ? (
          <p className="loading-text">Loading your submissions...</p>
        ) : reports.length === 0 ? (
          <p className="empty-text">You haven't submitted any work yet.</p>
        ) : (
          <div className="reports-list">
            {reports.map((r) => (
              <div key={r.id} className="report-item">
                <div className="report-item-header">
                  <div>
                    <div className="report-species">{r.title || r.species}</div>
                    <span className="report-type-badge">{r.type || "Sighting Report"}</span>
                  </div>
                  <span className={`report-status ${getStatusClass(r.status)}`}>
                    {r.status}
                  </span>
                </div>
                <div className="report-item-details">
                  {r.location && <span>📍 {r.location}</span>}
                  {r.date && <span>📅 {r.date}</span>}
                  {r.time && <span>🕐 {r.time}</span>}
                </div>
                <p className="report-item-desc">{r.description}</p>
                {r.photoURL && (
                  <img src={r.photoURL} alt="Submission" className="report-thumbnail" />
                )}

                {/* Legacy teacherNote display */}
                {r.teacherNote && (
                  <div className="teacher-note-display">
                    <strong>Teacher Note:</strong> {r.teacherNote}
                  </div>
                )}

                {/* Feedback array display */}
                {r.feedback && r.feedback.length > 0 && (
                  <div className="feedback-section">
                    <button
                      className="feedback-toggle-btn"
                      onClick={() => setExpandedFeedback(expandedFeedback === r.id ? null : r.id)}
                    >
                      💬 Teacher Feedback ({r.feedback.length})
                      <span className="feedback-chevron">
                        {expandedFeedback === r.id ? "▲" : "▼"}
                      </span>
                    </button>
                    
                    {expandedFeedback === r.id && (
                      <div className="feedback-thread">
                        {r.feedback.map((fb, idx) => (
                          <div key={idx} className="feedback-entry">
                            <div className="feedback-meta">
                              <span className="feedback-author">{fb.teacherEmail || "Teacher"}</span>
                              <span className="feedback-time">{formatFeedbackTime(fb.timestamp)}</span>
                            </div>
                            <p className="feedback-text">{fb.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

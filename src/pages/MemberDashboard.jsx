import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./MemberDashboard.css";

export default function MemberDashboard() {
  const { user, userData, orgId } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState("");
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Contribution Form State ── */
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("Article");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSpecies, setFormSpecies] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPhotoURL, setFormPhotoURL] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch org name
        if (orgId) {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) setOrgName(orgDoc.data().orgName || "");
        }

        // Fetch member contributions
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const contribSnap = await getDocs(contribQ);
        const items = contribSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        items.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setContributions(items);
      } catch (err) {
        console.error("Error loading member data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, orgId]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setFormMessage("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setFormMessage("");

    try {
      const contribution = {
        title: formTitle.trim(),
        description: formContent.trim(),
        type: formType,
        studentId: user.uid,
        studentEmail: userData?.displayName || user.email,
        contributorName: userData?.displayName || "Community Member",
        orgId: orgId || null,
        organizationType: "community",
        status: "submitted",
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString("en-GB"),
      };

      if (formType === "Sighting Report") {
        contribution.species = formSpecies.trim();
        contribution.location = formLocation.trim();
      }
      if (formPhotoURL.trim()) {
        contribution.photoURL = formPhotoURL.trim();
      }

      const docRef = await addDoc(collection(db, "contributions"), contribution);

      setContributions((prev) => [
        { id: docRef.id, ...contribution, createdAt: { toDate: () => new Date() } },
        ...prev,
      ]);

      setFormTitle("");
      setFormContent("");
      setFormSpecies("");
      setFormLocation("");
      setFormPhotoURL("");
      setShowForm(false);
      setFormMessage("Contribution submitted successfully!");

      setTimeout(() => setFormMessage(""), 4000);
    } catch (err) {
      console.error("Error submitting contribution:", err);
      setFormMessage(`Failed to submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const articleCount = contributions.filter(
    (c) => c.type === "Article" || c.type === "Essay" || c.type === "Column"
  ).length;
  const sightingCount = contributions.filter((c) => c.type === "Sighting Report").length;

  return (
    <div className="member-dashboard">
      <div className="member-welcome">
        <h2>Welcome, {userData?.displayName || user?.email}</h2>
        <p className="member-date">{today}</p>
        {orgName && <p className="member-org">🏢 {orgName}</p>}
      </div>

      {/* ── Stats ── */}
      <div className="member-stats">
        <div className="member-stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-number">{articleCount}</div>
          <div className="stat-label">Articles / Essays</div>
        </div>
        <div className="member-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">Sighting Reports</div>
        </div>
        <div className="member-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">{contributions.length}</div>
          <div className="stat-label">Total Contributions</div>
        </div>
      </div>

      {/* ── Contribution Form ── */}
      <div className="member-section">
        <div className="section-header-row">
          <h3>📝 Submit Contribution</h3>
          <button
            className="section-action-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ New Contribution"}
          </button>
        </div>

        {formMessage && (
          <p className={`form-feedback ${formMessage.includes("success") ? "form-feedback-success" : "form-feedback-error"}`}>
            {formMessage}
          </p>
        )}

        {showForm && (
          <div className="contribution-form">
            <div className="form-row">
              <label className="form-label">Type *</label>
              <select
                className="form-select"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="Article">Article</option>
                <option value="Essay">Essay</option>
                <option value="Column">Column</option>
                <option value="Sighting Report">Sighting Report</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Content / Description *</label>
              <textarea
                className="form-textarea-lg"
                placeholder="Write your article, essay, or sighting description..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
            </div>

            {formType === "Sighting Report" && (
              <>
                <div className="form-row">
                  <label className="form-label">Species</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Sumatran Tiger"
                    value={formSpecies}
                    onChange={(e) => setFormSpecies(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Location</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="General area (do NOT share exact GPS)"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-row">
              <label className="form-label">Photo URL (optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="https://example.com/photo.jpg"
                value={formPhotoURL}
                onChange={(e) => setFormPhotoURL(e.target.value)}
              />
            </div>

            <button
              className="submit-contribution-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Contribution"}
            </button>
          </div>
        )}
      </div>

      {/* ── My Contributions ── */}
      <div className="member-section">
        <h3>📚 My Contributions</h3>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : contributions.length === 0 ? (
          <div className="empty-state">
            <p>You haven't submitted any contributions yet.</p>
            <button className="empty-state-btn" onClick={() => setShowForm(true)}>
              Submit Your First Contribution
            </button>
          </div>
        ) : (
          <div className="contributions-list">
            {contributions.map((c) => (
              <div key={c.id} className="contribution-card">
                <div className="contrib-card-header">
                  <span className="contrib-type-badge">{c.type}</span>
                  <span className="contrib-status">{c.status}</span>
                </div>
                <h4 className="contrib-title">{c.title}</h4>
                <p className="contrib-desc">{c.description}</p>
                {c.species && <p className="contrib-species">🦎 {c.species}</p>}
                {c.date && <span className="contrib-date">📅 {c.date}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="member-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => setShowForm(true)}>
            📝 New Contribution
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/member/profile")}>
            👤 My Profile
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/member/messages")}>
            ✉️ Messages
          </button>
        </div>
      </div>
    </div>
  );
}

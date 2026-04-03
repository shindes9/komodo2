import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { createNotification } from "../utils/notifications";
import "./SchoolLibrary.css";

/**
 * Teacher Library — Review Dashboard
 * 
 * Shows FULL details: student name, email, timestamp, feedback thread.
 * Teachers can leave multiple feedback entries (appended to feedback[] array).
 * Only the assigned teacher and the owning student can see feedback.
 */
export default function TeacherLibrary() {
  const { user, schoolId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user || !schoolId) return;
    fetchItems();
  }, [user, schoolId]);

  const fetchItems = async () => {
    try {
      const contribQ = query(
        collection(db, "contributions"),
        where("schoolId", "==", schoolId)
      );
      const contribSnap = await getDocs(contribQ);
      const contribItems = contribSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || `${data.species || "Unknown"} Sighting - ${data.location || ""}`,
          type: data.type || "Sighting Report",
          description: data.description || "",
          date: data.date || "",
          studentId: data.studentId,
          studentEmail: data.studentEmail || "Anonymous",
          photoURL: data.photoURL || "",
          status: data.status || "pending",
          feedback: data.feedback || [],
          teacherNote: data.teacherNote || "", // legacy field
          createdAt: data.createdAt,
          isPublished: data.isPublished || false,
          isPublic: data.isPublic || false,
        };
      });

      // Sort by createdAt descending
      contribItems.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });

      setItems(contribItems);
      if (contribItems.length > 0) {
        setSelectedItem(contribItems[0]);
      }
    } catch (err) {
      console.error("Error fetching teacher library:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add feedback entry to the contributions document.
   * Uses arrayUnion to append a new feedback object.
   */
  const handleAddFeedback = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setSavingFeedback(true);

    try {
      const newFeedback = {
        teacherId: user.uid,
        teacherEmail: user.email,
        text: feedbackText.trim(),
        timestamp: Timestamp.now(),
      };

      await updateDoc(doc(db, "contributions", selectedItem.id), {
        feedback: arrayUnion(newFeedback),
        status: "reviewed",
      });

      // Notify the student
      if (selectedItem.studentId) {
        createNotification(
          selectedItem.studentId,
          `New feedback on "${selectedItem.title}" from ${user.email}`
        );
      }

      // Update local state
      const updatedFeedback = [...(selectedItem.feedback || []), newFeedback];
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, status: "reviewed", feedback: updatedFeedback }
            : i
        )
      );
      setSelectedItem((prev) => ({
        ...prev,
        status: "reviewed",
        feedback: updatedFeedback,
      }));
      setFeedbackText("");
    } catch (err) {
      console.error("Error adding feedback:", err);
    } finally {
      setSavingFeedback(false);
    }
  };

  /**
   * Teacher Gatekeeper: Publish a submission to the Public Library.
   * Sets isPublished: true, publishedAt timestamp, and isPublic: true.
   * Only teachers (and principals) can trigger this — students never see this button.
   */
  const handlePublish = async () => {
    if (!selectedItem) return;
    setPublishing(true);

    try {
      await updateDoc(doc(db, "contributions", selectedItem.id), {
        isPublished: true,
        isPublic: true,
        publishedAt: serverTimestamp(),
        publishedBy: user.uid,
        publishedByEmail: user.email,
      });

      // Notify the student
      if (selectedItem.studentId) {
        createNotification(
          selectedItem.studentId,
          `Your submission "${selectedItem.title}" has been published to the Public Library by ${user.email}!`
        );
      }

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, isPublished: true, isPublic: true }
            : i
        )
      );
      setSelectedItem((prev) => ({
        ...prev,
        isPublished: true,
        isPublic: true,
      }));
    } catch (err) {
      console.error("Error publishing to library:", err);
    } finally {
      setPublishing(false);
    }
  };

  const typeOptions = useMemo(() => {
    return [...new Set(items.map((i) => i.type))];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterType !== "all") {
      result = result.filter((i) => i.type === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }
    return result;
  }, [items, filterType, filterStatus]);

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

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const reviewedCount = items.filter((i) => i.status === "reviewed").length;

  return (
    <div className="school-library-page">
      <div className="school-library-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="sl-back-btn"
            onClick={() => navigate("/teacher")}
            title="Back to Dashboard"
          >
            Back
          </button>
          <div>
            <h3>Review Dashboard</h3>
            <p className="school-library-desc">
              Review student submissions from your school. Leave feedback notes that only you and the student can see.
            </p>
          </div>
        </div>
      </div>

      <div className="review-stats-bar">
        <span className="review-stat">📋 Total: {items.length}</span>
        <span className="review-stat review-stat-pending">⏳ Pending: {pendingCount}</span>
        <span className="review-stat review-stat-done">✅ Reviewed: {reviewedCount}</span>
      </div>

      <div className="school-library-filters">
        <button
          className={`sl-filter-btn ${filterType === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          All Types
        </button>
        {typeOptions.map((t) => (
          <button
            key={t}
            className={`sl-filter-btn ${filterType === t ? "sl-filter-active" : ""}`}
            onClick={() => setFilterType(t)}
          >
            {t}
          </button>
        ))}
        <span className="filter-divider">|</span>
        <button
          className={`sl-filter-btn ${filterStatus === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          All Status
        </button>
        <button
          className={`sl-filter-btn ${filterStatus === "pending" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("pending")}
        >
          Pending
        </button>
        <button
          className={`sl-filter-btn ${filterStatus === "reviewed" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("reviewed")}
        >
          Reviewed
        </button>
      </div>

      {loading ? (
        <p className="sl-loading">Loading submissions...</p>
      ) : (
        <div className="school-library-grid">
          <div className="sl-list-panel">
            <div className="sl-list-header">
              Submissions ({filtered.length})
            </div>
            <div className="sl-list-scroll">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  className={`sl-list-item ${selectedItem?.id === item.id ? "sl-list-item-active" : ""}`}
                  onClick={() => { setSelectedItem(item); setFeedbackText(""); }}
                >
                  <div className="sl-list-item-title">{item.title}</div>
                  <div className="sl-list-item-meta">
                    <span className="sl-list-type">{item.type}</span>
                    <span className={`sl-list-status ${item.status}`}>{item.status}</span>
                  </div>
                  <div className="sl-list-item-author">By: {item.studentEmail}</div>
                  {item.feedback && item.feedback.length > 0 && (
                    <span className="sl-feedback-count">
                      💬 {item.feedback.length}
                    </span>
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="sl-no-items">No submissions found.</div>
              )}
            </div>
          </div>

          <div className="sl-reader-panel">
            {!selectedItem ? (
              <div className="sl-empty-reader">Select a submission to review.</div>
            ) : (
              <>
                <h2>{selectedItem.title}</h2>
                <div className="sl-reader-meta">
                  <span className="sl-reader-type">{selectedItem.type}</span>
                  <span className="sl-reader-author">By: {selectedItem.studentEmail}</span>
                  {selectedItem.date && <span className="sl-reader-date">{selectedItem.date}</span>}
                  <span className={`sl-reader-status ${selectedItem.status}`}>
                    {selectedItem.status}
                  </span>
                </div>

                {selectedItem.photoURL && (
                  <img
                    src={selectedItem.photoURL}
                    alt="Submission"
                    className="sl-reader-photo"
                  />
                )}

                <div className="sl-reader-body">{selectedItem.description}</div>

                {/* Legacy teacherNote display */}
                {selectedItem.teacherNote && (
                  <div className="sl-teacher-review-note">
                    <strong>Legacy Review Note:</strong> {selectedItem.teacherNote}
                  </div>
                )}

                {/* ── PUBLISH TO PUBLIC LIBRARY (Teacher Gatekeeper) ── */}
                <div className="sl-publish-section">
                  {selectedItem.isPublished ? (
                    <div className="sl-published-badge">
                      ✅ Published to Public Library
                    </div>
                  ) : (
                    <button
                      className="sl-publish-btn"
                      onClick={handlePublish}
                      disabled={publishing}
                      title="Make this submission visible on the Public Library"
                    >
                      {publishing ? "Publishing..." : "📢 Publish to Public Library"}
                    </button>
                  )}
                </div>

                {/* Feedback thread */}
                <div className="sl-feedback-section">
                  <h4 className="sl-feedback-title">
                    💬 Feedback & Notes ({selectedItem.feedback?.length || 0})
                  </h4>
                  
                  {selectedItem.feedback && selectedItem.feedback.length > 0 ? (
                    <div className="sl-feedback-thread">
                      {selectedItem.feedback.map((fb, idx) => (
                        <div key={idx} className={`sl-feedback-entry ${fb.teacherId === user.uid ? "sl-feedback-mine" : ""}`}>
                          <div className="sl-feedback-meta">
                            <span className="sl-feedback-author">
                              {fb.teacherId === user.uid ? "You" : fb.teacherEmail}
                            </span>
                            <span className="sl-feedback-time">
                              {formatFeedbackTime(fb.timestamp)}
                            </span>
                          </div>
                          <p className="sl-feedback-text">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="sl-no-feedback">No feedback yet. Be the first to leave a note.</p>
                  )}

                  {/* Add feedback form - always available */}
                  <div className="sl-feedback-form">
                    <textarea
                      className="sl-feedback-textarea"
                      placeholder="Write feedback for this submission..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    <button
                      className="sl-feedback-submit-btn"
                      onClick={handleAddFeedback}
                      disabled={savingFeedback || !feedbackText.trim()}
                    >
                      {savingFeedback ? "Saving..." : "Add Feedback"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

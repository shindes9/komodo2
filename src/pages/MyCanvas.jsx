import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import "./MyCanvas.css";

export default function MyCanvas() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Unified Snapshot Listener for all contributions exactly matching user UID
    const q = query(
      collection(db, "contributions"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContributions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching canvas data:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending Review";
      case "reviewed":
        return "Reviewed";
      case "published":
        return "Published";
      default:
        return status || "Pending";
    }
  };

  const getStatusClass = (status) => {
    if (status === "reviewed") return "status-reviewed";
    if (status === "published") return "status-published";
    return "status-pending";
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Timeline Progress Nodes
  const renderTimeline = () => {
    if (contributions.length === 0) return null;

    return (
      <div className="canvas-timeline">
        {contributions.map((c) => {
          let actionText = `${c.type || "Sighting Report"} Submitted`;
          if (c.status === "reviewed") actionText = `${c.type || "Sighting Report"} Reviewed`;
          if (c.isVisibleInSchool || c.isVisibleInPublic) {
            actionText = `${c.type || "Sighting Report"} Published!`;
          }

          return (
            <div key={`timeline-${c.id}`} className="timeline-node">
              <div className="timeline-date">{formatDate(c.createdAt)}</div>
              <div className="timeline-action">{actionText}</div>
              <div className={`timeline-status ${getStatusClass(c.status)}`}>
                {getStatusLabel(c.status)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const rolePrefix = userData?.role === "member" ? "/member" : "/student";
  const displayName = userData?.displayName || user?.email?.split("@")[0] || "Student";

  return (
    <div className="my-canvas-page">
      <div className="canvas-header">
        <div className="canvas-header-info">
          <h2>🎨 {displayName}'s Canvas</h2>
          <p className="canvas-subtitle">Your unified conservation portfolio and timeline.</p>
        </div>
        <button
          className="canvas-new-btn"
          onClick={() => navigate(`${rolePrefix}/sightings`)}
          style={{
            background: "#2E7D32",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          + Submit Work
        </button>
      </div>

      <div className="canvas-stats-bar">
        <div className="canvas-stat">
          <span className="canvas-stat-num">{contributions.length}</span>
          <span className="canvas-stat-label">Total Contributions</span>
        </div>
        <div className="canvas-stat">
          <span className="canvas-stat-num">
            {contributions.filter((c) => c.status === "pending").length}
          </span>
          <span className="canvas-stat-label">Pending Review</span>
        </div>
        <div className="canvas-stat">
          <span className="canvas-stat-num">
            {contributions.filter((c) => c.isVisibleInSchool || c.isVisibleInPublic).length}
          </span>
          <span className="canvas-stat-label">Published Works</span>
        </div>
      </div>

      <div className="canvas-layout">
        <div className="canvas-main-col">
          <h3 className="canvas-section-title">📂 My Contributions</h3>

          {loading ? (
            <div>
              <div className="skeleton-loader"></div>
              <div className="skeleton-loader"></div>
              <div className="skeleton-loader"></div>
            </div>
          ) : contributions.length === 0 ? (
            <div className="canvas-empty">
              <h3>Your canvas is empty!</h3>
              <p>Start your conservation journey by submitting a sighting report.</p>
            </div>
          ) : (
            <div className="canvas-grid">
              {contributions.map((c) => (
                <div key={c.id} className="canvas-card">
                  <div className="canvas-card-top">
                    <div>
                      <div className="canvas-card-title">
                        {c.title || c.species || "Untitled"}
                      </div>
                      <span className="canvas-card-type">
                        {c.type || "Sighting Report"}
                      </span>
                    </div>
                    <span
                      className={`canvas-status-badge ${getStatusClass(c.status)}`}
                    >
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      📅 {formatDate(c.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="canvas-side-col">
          <h3 className="canvas-section-title">⏱️ My Progress</h3>
          {loading ? (
            <div>
              <div className="skeleton-loader" style={{ height: "40px" }}></div>
              <div className="skeleton-loader" style={{ height: "40px" }}></div>
            </div>
          ) : contributions.length === 0 ? (
            <p style={{ color: "#666", fontSize: "14px" }}>
              No timeline events yet.
            </p>
          ) : (
            renderTimeline()
          )}
        </div>
      </div>
    </div>
  );
}

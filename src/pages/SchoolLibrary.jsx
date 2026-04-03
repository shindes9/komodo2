import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import "./SchoolLibrary.css";

/**
 * SchoolLibrary — Visibility Matrix
 * 
 * PUBLIC VIEW (no auth / public / community role):
 *   - Shows: content, description, schoolName, type, date, photoURL
 *   - STRIPS: studentName, studentEmail, studentId, studentProfile
 *   - Only shows contributions with isPublic === true
 * 
 * INTERNAL VIEW (student / teacher / principal / admin):
 *   - Shows: full details including student name, email, timestamp
 *   - Shows all contributions from their schoolId
 */
export default function SchoolLibrary() {
  const { user, role, schoolId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const isPublicVisitor = !user || role === "public" || role === "community";

  useEffect(() => {
    fetchItems();
  }, [user, schoolId]);

  const fetchItems = async () => {
    try {
      let contribItems = [];

      if (isPublicVisitor) {
        // ── PUBLIC VIEW ──
        // Only show contributions published to public (teacher-gated)
        // CRITICALLY: strip all student PII
        const publicQ = query(
          collection(db, "contributions"),
          where("isVisibleToPublic", "==", true)
        );
        const publicSnap = await getDocs(publicQ);

        // Build a cache of school names for display
        const schoolCache = {};

        contribItems = await Promise.all(
          publicSnap.docs.map(async (d) => {
            const data = d.data();

            // Fetch school name if not cached
            let schoolName = "Unknown School";
            if (data.schoolId) {
              if (schoolCache[data.schoolId]) {
                schoolName = schoolCache[data.schoolId];
              } else {
                try {
                  const schoolDoc = await getDoc(doc(db, "schools", data.schoolId));
                  if (schoolDoc.exists()) {
                    schoolName = schoolDoc.data().schoolName || "Unknown School";
                    schoolCache[data.schoolId] = schoolName;
                  }
                } catch {
                  // keep default
                }
              }
            }

            // ╔══════════════════════════════════════════════════╗
            // ║  PRIVACY FILTER: Strip ALL student PII fields   ║
            // ║  studentName, studentEmail, studentId,           ║
            // ║  studentProfile are NEVER included              ║
            // ╚══════════════════════════════════════════════════╝
            return {
              id: d.id,
              title: data.title || `${data.species || "Unknown"} Sighting`,
              type: data.type || "Sighting Report",
              description: data.description || "",
              date: data.date || "",
              schoolName: schoolName,
              // NO authorId, NO studentName, NO studentEmail, NO studentProfile
              authorId: null,
              anonymousName: "Anonymous Contributor",
              photoURL: data.photoURL || "",
              status: data.status || "approved",
            };
          })
        );
      } else if (schoolId) {
        // ── INTERNAL VIEW ──
        // Only show contributions that teacher has published to school library
        const schoolQ = query(
          collection(db, "contributions"),
          where("schoolId", "==", schoolId),
          where("isVisibleInSchool", "==", true)
        );
        const schoolSnap = await getDocs(schoolQ);

        // Get school name for display
        let schoolName = "";
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            schoolName = schoolDoc.data().schoolName || "";
          }
        } catch {
          // ignore
        }

        contribItems = schoolSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || `${data.species || "Unknown"} Sighting - ${data.location || ""}`,
            type: data.type || "Sighting Report",
            description: data.description || "",
            date: data.date || "",
            schoolName: schoolName,
            authorId: data.studentId,
            // Internal users see student info based on role
            anonymousName: role === "student"
              ? "Student #" + (data.studentId || "").slice(-4)
              : data.studentEmail || "Student",
            studentEmail: data.studentEmail || "",
            photoURL: data.photoURL || "",
            status: data.status || "pending",
            isPublished: data.isPublished || false,
            createdAt: data.createdAt,
          };
        });
      } else {
        // Fallback: no school (shouldn't happen for auth users normally)
        const allQ = query(collection(db, "sightings"), orderBy("createdAt", "desc"));
        const allSnap = await getDocs(allQ);
        contribItems = allSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: `${data.species} Sighting - ${data.location}`,
            type: "Sighting Report",
            description: data.description || "",
            date: data.date || "",
            authorId: data.userId,
            anonymousName: "Student #" + (data.userId || "").slice(-4),
            photoURL: data.photoURL || "",
            status: data.status || "pending",
          };
        });
      }

      setItems(contribItems);
      if (contribItems.length > 0) {
        setSelectedItem(contribItems[0]);
      }
    } catch (err) {
      console.error("Error fetching school library:", err);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = useMemo(() => {
    const types = [...new Set(items.map((i) => i.type))];
    return types;
  }, [items]);

  const filtered = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter((i) => i.type === filterType);
  }, [items, filterType]);

  const backPath = role === "student"
    ? "/student"
    : role === "principal"
    ? "/principal"
    : role === "teacher"
    ? "/teacher"
    : "/library";

  return (
    <div className="school-library-page">
      <div className="school-library-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="sl-back-btn"
            onClick={() => navigate(backPath)}
            title="Back to Dashboard"
          >
            Back
          </button>
          <div>
            <h3>School Library</h3>
            <p className="school-library-desc">
              {isPublicVisitor
                ? "Browse approved student contributions. Student identities are hidden for privacy."
                : "Browse student contributions including sighting reports, conservation efforts, and field notes."}
            </p>
          </div>
        </div>
      </div>

      {isPublicVisitor && (
        <div className="public-privacy-notice">
          🔒 Student names, profiles, and private messages are not displayed to public visitors. 
          Only approved content is shown.
        </div>
      )}

      <div className="school-library-filters">
        <button
          className={`sl-filter-btn ${filterType === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          All ({items.length})
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
      </div>

      {loading ? (
        <p className="sl-loading">Loading contributions...</p>
      ) : (
        <div className="school-library-grid">
          <div className="sl-list-panel">
            <div className="sl-list-header">
              Contributions ({filtered.length})
            </div>
            <div className="sl-list-scroll">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  className={`sl-list-item ${selectedItem?.id === item.id ? "sl-list-item-active" : ""}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="sl-list-item-title">{item.title}</div>
                  <div className="sl-list-item-meta">
                    <span className="sl-list-type">{item.type}</span>
                    {/* Only show author for internal (non-public) users */}
                    {!isPublicVisitor && (
                      <span className="sl-list-author">{item.anonymousName}</span>
                    )}
                    {/* Show school name for public visitors */}
                    {isPublicVisitor && item.schoolName && (
                      <span className="sl-list-author">{item.schoolName}</span>
                    )}
                    {/* Published/Internal badge */}
                    {!isPublicVisitor && item.isPublished && (
                      <span style={{ fontSize: "10px", background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "6px", fontWeight: 600 }}>
                        Published
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="sl-no-items">No contributions found.</div>
              )}
            </div>
          </div>

          <div className="sl-reader-panel">
            {!selectedItem ? (
              <div className="sl-empty-reader">Select a contribution to read.</div>
            ) : (
              <>
                <h2>{selectedItem.title}</h2>
                <div className="sl-reader-meta">
                  <span className="sl-reader-type">{selectedItem.type}</span>
                  {/* PUBLIC: show school name, NOT student identity */}
                  {isPublicVisitor && selectedItem.schoolName && (
                    <span className="sl-reader-author">From: {selectedItem.schoolName}</span>
                  )}
                  {/* INTERNAL: show student email */}
                  {!isPublicVisitor && (
                    <span className="sl-reader-author">{selectedItem.anonymousName}</span>
                  )}
                  {selectedItem.date && <span className="sl-reader-date">{selectedItem.date}</span>}
                </div>

                {selectedItem.photoURL && (
                  <img
                    src={selectedItem.photoURL}
                    alt="Contribution"
                    className="sl-reader-photo"
                  />
                )}

                <div className="sl-reader-body">{selectedItem.description}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

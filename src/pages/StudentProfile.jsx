import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "./StudentProfile.css";

const avatarOptions = [
  { emoji: "🦎", label: "Komodo" },
  { emoji: "🐅", label: "Tiger" },
  { emoji: "🦏", label: "Rhino" },
  { emoji: "🐘", label: "Elephant" },
  { emoji: "🦜", label: "Parrot" },
  { emoji: "🐢", label: "Turtle" },
  { emoji: "🦈", label: "Shark" },
  { emoji: "🐒", label: "Monkey" },
];

const colorOptions = [
  { name: "Forest Green", value: "#2E7D32" },
  { name: "Dark Teal", value: "#00695C" },
  { name: "Ocean Blue", value: "#1565C0" },
  { name: "Warm Amber", value: "#E65100" },
  { name: "Deep Purple", value: "#6A1B9A" },
];

const programNames = {
  komodo_dragon: "Komodo Dragon Conservation",
  sumatran_tiger: "Sumatran Tiger Watch",
  javan_rhino: "Javan Rhino Protection",
};

export default function StudentProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("🦎");
  const [accentColor, setAccentColor] = useState("#2E7D32");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [sightings, setSightings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || "");
          setAvatar(data.avatar || "🦎");
          setAccentColor(data.accentColor || "#2E7D32");
          setBio(data.bio || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchContributions = async () => {
      try {
        const sightingsQ = query(
          collection(db, "sightings"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const sightingsSnap = await getDocs(sightingsQ);
        setSightings(
          sightingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );

        const enrollQ = query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid)
        );
        const enrollSnap = await getDocs(enrollQ);
        setEnrollments(
          enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );

        // Fetch contributions (with teacher feedback)
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const contribSnap = await getDocs(contribQ);
        setContributions(
          contribSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Error loading contributions:", err);
      } finally {
        setLoadingContributions(false);
      }
    };

    fetchProfile();
    fetchContributions();
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
        accentColor,
      });
      setSaveMessage("Profile saved!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const timelineItems = [
    ...sightings.map((s) => ({
      id: s.id,
      type: "sighting",
      title: `Sighting Report: ${s.species}`,
      description: s.description,
      date: s.date,
      status: s.status,
      teacherNote: s.teacherNote,
    })),
    ...enrollments.map((e) => ({
      id: e.id,
      type: "enrollment",
      title: `Enrolled in ${programNames[e.programId] || e.programId}`,
      description: "",
      date: e.enrolledAt?.toDate ? e.enrolledAt.toDate().toLocaleDateString() : "",
      status: "active",
      teacherNote: "",
    })),
  ].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h3>My Profile</h3>

        {loadingProfile ? (
          <p className="loading-text">Loading profile...</p>
        ) : (
          <div className="profile-form">
            <div className="profile-avatar-section">
              <div
                className="profile-avatar-display"
                style={{ borderColor: accentColor }}
              >
                {avatar}
              </div>
              <div className="avatar-options">
                {avatarOptions.map((opt) => (
                  <button
                    key={opt.emoji}
                    className={`avatar-option ${avatar === opt.emoji ? "avatar-option-active" : ""}`}
                    onClick={() => setAvatar(opt.emoji)}
                    title={opt.label}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-field">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="profile-field">
              <label>Email</label>
              <input type="text" value={user?.email || ""} disabled />
            </div>

            <div className="profile-field">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio about yourself..."
                style={{ resize: "vertical", minHeight: "60px", fontFamily: "inherit", padding: "10px", borderRadius: "8px", border: "1px solid #d7e3d9", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div className="profile-field">
              <label>Accent Color</label>
              <div className="color-options">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    className={`color-option ${accentColor === c.value ? "color-option-active" : ""}`}
                    style={{ background: c.value }}
                    onClick={() => setAccentColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {saveMessage && <p className="save-message">{saveMessage}</p>}

            <button
              className="save-profile-btn"
              style={{ background: accentColor }}
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>My Contributions</h3>

        {loadingContributions ? (
          <p className="loading-text">Loading...</p>
        ) : contributions.length === 0 && sightings.length === 0 ? (
          <p className="empty-text">No contributions or sighting reports yet.</p>
        ) : (
          <div className="contributions-list">
            {/* Contributions from contributions collection (with feedback) */}
            {contributions.map((c) => (
              <div key={c.id} className="contribution-item">
                <div className="contribution-header">
                  <span className="contribution-title">
                    {c.title || `${c.species || "Unknown"} Sighting`}
                  </span>
                  <span className={`contribution-status status-${c.status || "pending"}`}>
                    {c.status || "pending"}
                  </span>
                </div>
                <p className="contribution-desc">{c.description}</p>
                {c.date && <span className="contribution-date">{c.date}</span>}

                {/* Teacher Feedback Thread */}
                {c.feedback && c.feedback.length > 0 && (
                  <div className="contribution-feedback-section">
                    <strong style={{ color: "#2E7D32", fontSize: "13px" }}>Teacher Feedback:</strong>
                    {c.feedback.map((fb, idx) => (
                      <div key={idx} style={{ background: "#f4f8f4", padding: "8px 12px", borderRadius: "8px", marginTop: "6px", borderLeft: "3px solid #2E7D32" }}>
                        <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 700 }}>{fb.teacherEmail || "Teacher"}</div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#333" }}>{fb.text}</p>
                        {fb.timestamp?.seconds && (
                          <span style={{ fontSize: "11px", color: "#999" }}>
                            {new Date(fb.timestamp.seconds * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Legacy sightings */}
            {sightings.map((s) => (
              <div key={s.id} className="contribution-item">
                <div className="contribution-header">
                  <span className="contribution-title">{s.species} Sighting</span>
                  <span className={`contribution-status status-${s.status}`}>{s.status}</span>
                </div>
                <p className="contribution-desc">{s.description}</p>
                <span className="contribution-date">{s.date} | {s.location}</span>
                {s.teacherNote && (
                  <div className="contribution-feedback-section">
                    <strong style={{ color: "#2E7D32", fontSize: "13px" }}>Teacher Note:</strong>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#333" }}>{s.teacherNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>My Programs</h3>

        {loadingContributions ? (
          <p className="loading-text">Loading...</p>
        ) : enrollments.length === 0 ? (
          <p className="empty-text">Not enrolled in any programs.</p>
        ) : (
          <div className="enrolled-programs">
            {enrollments.map((e) => (
              <div key={e.id} className="enrolled-program-card" style={{ borderLeftColor: accentColor }}>
                <div className="enrolled-program-name">
                  {programNames[e.programId] || e.programId}
                </div>
                <div className="enrolled-program-status">Active</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>Progress Canvas</h3>
        <p className="canvas-desc">
          Your conservation journey timeline — a compilation of all your sightings, feedback, and programs.
        </p>

        {timelineItems.length === 0 ? (
          <p className="empty-text">Start contributing to build your portfolio!</p>
        ) : (
          <div className="timeline">
            {timelineItems.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot" style={{ background: accentColor }}></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">{item.title}</span>
                    {item.date && <span className="timeline-date">{item.date}</span>}
                  </div>
                  {item.description && (
                    <p className="timeline-desc">{item.description}</p>
                  )}
                  {item.teacherNote && (
                    <div className="timeline-teacher-note">
                      <strong>Teacher Feedback:</strong> {item.teacherNote}
                    </div>
                  )}
                  <span className={`timeline-status status-${item.status}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
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
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./PrincipalDashboard.css";

export default function PrincipalDashboard() {
  const { user, schoolId: authSchoolId } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [schoolName, setSchoolName] = useState("");
  const [schoolDesc, setSchoolDesc] = useState("");
  const [schoolLocation, setSchoolLocation] = useState("");
  const [schoolId, setSchoolId] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState("");

  const [accessCode, setAccessCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [allCodes, setAllCodes] = useState([]);

  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  const [studentCount, setStudentCount] = useState(0);
  const [sightingCount, setSightingCount] = useState(0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!user) return;

    const fetchSchool = async () => {
      try {
        const q = query(
          collection(db, "schools"),
          where("principalId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
          const schoolDoc = snapshot.docs[0];
          const data = schoolDoc.data();
          setSchoolId(schoolDoc.id);
          setSchoolName(data.schoolName || "");
          setSchoolDesc(data.description || "");
          setSchoolLocation(data.location || "");
        }
      } catch (err) {
        console.error("Error fetching school:", err);
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchool();
  }, [user]);

  useEffect(() => {
    if (!user || !schoolId) return;

    const fetchSchoolUsers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("schoolId", "==", schoolId)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeachers(data.filter(u => u.role === "teacher"));
        setStudentCount(data.filter(u => u.role === "student").length);
      } catch (err) {
        console.error("Error fetching school users:", err);
      } finally {
        setLoadingTeachers(false);
      }
    };

    const fetchAccessCodes = async () => {
      try {
        const q = query(
          collection(db, "accessCodes"),
          where("createdBy", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const codes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        codes.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setAllCodes(codes);

        const activeCode = codes.find((c) => c.active);
        if (activeCode) {
          setAccessCode(activeCode.code || "");
        }
      } catch (err) {
        console.error("Error fetching access codes:", err);
      }
    };

    const fetchCounts = async () => {
      try {
        const sightingsSnap = await getDocs(
          query(
            collection(db, "contributions"),
            where("schoolId", "==", schoolId)
          )
        );
        setSightingCount(sightingsSnap.size);
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };

    const fetchLibrary = async () => {
      try {
        const contribSnap = await getDocs(
          query(
            collection(db, "contributions"),
            where("schoolId", "==", schoolId)
          )
        );
        const items = contribSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || `${data.species || "Unknown"} Sighting - ${data.location || ""}`,
            author: data.studentName || data.studentEmail || "Anonymous",
            type: data.type || "Sighting Report",
            status: data.status || "pending",
            isPublic: data.isPublic || false,
          };
        });
        setLibraryItems(items);
      } catch (err) {
        console.error("Error fetching library:", err);
      } finally {
        setLoadingLibrary(false);
      }
    };

    fetchSchoolUsers();
    fetchAccessCodes();
    fetchCounts();
    fetchLibrary();
  }, [user, schoolId]);

  const handleSaveSchool = async () => {
    if (!schoolName.trim()) return;
    setSavingSchool(true);
    setSchoolMessage("");

    try {
      if (schoolId) {
        // Update existing school document
        await updateDoc(doc(db, "schools", schoolId), {
          schoolName: schoolName.trim(),
          description: schoolDesc.trim(),
          location: schoolLocation.trim(),
        });
        setSchoolMessage("School profile saved successfully!");
      } else {
        // Before creating, verify no school already exists for this principal
        // (guards against duplicate creation if local state was somehow reset)
        const existingQ = query(
          collection(db, "schools"),
          where("principalId", "==", user.uid)
        );
        const existingSnap = await getDocs(existingQ);

        if (!existingSnap.empty) {
          // School already exists — just link it and update
          const existingDoc = existingSnap.docs[0];
          const existingId = existingDoc.id;
          setSchoolId(existingId);
          await updateDoc(doc(db, "schools", existingId), {
            schoolName: schoolName.trim(),
            description: schoolDesc.trim(),
            location: schoolLocation.trim(),
          });
          await updateDoc(doc(db, "users", user.uid), { schoolId: existingId });
          setSchoolMessage("School profile saved successfully!");
          return;
        }

        // Truly no school yet — create one
        let newSchoolId;
        try {
          const docRef = await addDoc(collection(db, "schools"), {
            schoolName: schoolName.trim(),
            description: schoolDesc.trim(),
            location: schoolLocation.trim(),
            principalId: user.uid,
            createdAt: serverTimestamp(),
          });
          newSchoolId = docRef.id;
          setSchoolId(newSchoolId);
        } catch (schoolErr) {
          console.error("Error creating school document:", schoolErr);
          setSchoolMessage(`Failed to create school: ${schoolErr.message}`);
          return;
        }

        try {
          await updateDoc(doc(db, "users", user.uid), { schoolId: newSchoolId });
          setSchoolMessage("School profile saved successfully!");
        } catch (userUpdateErr) {
          console.error("Error linking school to user:", userUpdateErr);
          setSchoolMessage(`School created but failed to link to your profile: ${userUpdateErr.message}`);
        }
      }
    } catch (err) {
      console.error("Error saving school:", err);
      setSchoolMessage(`Failed to save: ${err.message}`);
    } finally {
      // Always reset — do NOT wrap in `if (savingSchool)` because savingSchool
      // is captured as the stale closure value (false) from before setSavingSchool(true).
      setSavingSchool(false);
    }
  };

  const generateAccessCode = async () => {
    if (!schoolId) {
      setSchoolMessage("Please save a school profile first before generating access codes.");
      return;
    }

    setGeneratingCode(true);
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const docRef = await addDoc(collection(db, "accessCodes"), {
        code: code,
        schoolId: schoolId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        active: true,
      });

      setAccessCode(code);
      setAllCodes((prev) => [
        { id: docRef.id, code, schoolId, createdBy: user.uid, active: true, createdAt: { toDate: () => new Date() } },
        ...prev,
      ]);
    } catch (err) {
      console.error("Error generating code:", err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const deactivateCode = async (codeId) => {
    try {
      await updateDoc(doc(db, "accessCodes", codeId), { active: false });
      setAllCodes((prev) =>
        prev.map((c) => (c.id === codeId ? { ...c, active: false } : c))
      );

      const stillActive = allCodes.find((c) => c.id !== codeId && c.active);
      if (stillActive) {
        setAccessCode(stillActive.code);
      } else {
        setAccessCode("");
      }
    } catch (err) {
      console.error("Error deactivating code:", err);
    }
  };

  const toggleLibraryVisibility = async (id) => {
    const item = libraryItems.find((i) => i.id === id);
    if (!item) return;

    try {
      await updateDoc(doc(db, "contributions", id), {
        isPublic: !item.isPublic,
      });
      setLibraryItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, isPublic: !i.isPublic } : i
        )
      );
    } catch (err) {
      console.error("Error toggling visibility:", err);
    }
  };

  const enrollmentData = [
    { label: "Komodo Dragon Conservation", value: 45 },
    { label: "Sumatran Tiger Watch", value: 32 },
    { label: "Javan Rhino Protection", value: 18 },
  ];

  const maxEnrollment = Math.max(...enrollmentData.map((d) => d.value));

  return (
    <div className="principal-dashboard">
      <div className="principal-welcome">
        <h2>Welcome back, {user?.email}</h2>
        <p className="principal-date">{today}</p>
      </div>

      <div className="principal-stats">
        <div className="principal-stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-number">{teachers.length}</div>
          <div className="stat-label">Teachers</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-number">{studentCount}</div>
          <div className="stat-label">School Students</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-number">3</div>
          <div className="stat-label">Active Programs</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">School Submissions</div>
        </div>
      </div>

      <div className="principal-section">
        <h3>School Profile</h3>

        {loadingSchool ? (
          <p className="loading-text">Loading school profile...</p>
        ) : (
          <div className="school-profile-form">
            <div className="form-row">
              <label className="form-label">School Name *</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter school name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              {!schoolName.trim() && <span className="form-validation-hint">School name is required</span>}
            </div>

            <div className="form-row">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Brief description of the school"
                value={schoolDesc}
                onChange={(e) => setSchoolDesc(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Labuan Bajo, Flores"
                value={schoolLocation}
                onChange={(e) => setSchoolLocation(e.target.value)}
              />
            </div>

            {schoolMessage && (
              <p className="school-save-message">{schoolMessage}</p>
            )}

            <button
              className="save-school-btn"
              onClick={handleSaveSchool}
              disabled={savingSchool || !schoolName.trim()}
            >
              {savingSchool ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}

        <div className="access-code-section">
          <h4>Student & Teacher Access Code</h4>
          <p className="access-code-desc">
            Students and teachers use this code to join your school on the platform.
          </p>
          <div className="access-code-display">
            {accessCode ? (
              <span className="access-code-value">{accessCode}</span>
            ) : (
              <span className="access-code-empty">No code generated yet</span>
            )}
            <button
              className="generate-code-btn"
              onClick={generateAccessCode}
              disabled={generatingCode || !schoolId}
              title="Generate a 6-character code for students and teachers to join your school"
            >
              {generatingCode ? "Generating..." : "Generate New Code"}
            </button>
          </div>
          {!schoolId && (
            <p className="form-validation-hint">Save a school profile first to generate access codes.</p>
          )}

          {allCodes.length > 0 && (
            <div className="codes-history">
              <h4>Code History</h4>
              <div className="codes-table">
                <div className="codes-table-header">
                  <span>Code</span>
                  <span>Created</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {allCodes.map((c) => (
                  <div key={c.id} className="codes-table-row">
                    <span className="code-value-small">{c.code}</span>
                    <span>{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : "—"}</span>
                    <span>
                      <span className={`code-status ${c.active ? "code-active" : "code-inactive"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </span>
                    <span>
                      {c.active && (
                        <button
                          className="deactivate-btn"
                          onClick={() => deactivateCode(c.id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="principal-section">
        <h3>School Teachers</h3>

        {loadingTeachers ? (
          <p className="loading-text">Loading teachers...</p>
        ) : teachers.length === 0 ? (
          <div className="empty-state">
            <p>No teachers registered at your school yet. Share the access code with your teachers.</p>
          </div>
        ) : (
          <div className="teachers-table">
            <div className="teachers-header">
              <span>Email</span>
              <span>Joined</span>
            </div>
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teachers-row">
                <span>{teacher.email}</span>
                <span>{teacher.createdAt?.toDate ? teacher.createdAt.toDate().toLocaleDateString() : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="principal-section">
        <h3>School Library (Student Submissions)</h3>
        <p className="section-desc">
          Student contributions from your school. Toggle visibility to control public access.
        </p>

        {loadingLibrary ? (
          <p className="loading-text">Loading submissions...</p>
        ) : libraryItems.length === 0 ? (
          <div className="empty-state">
            <p>No student submissions yet.</p>
          </div>
        ) : (
          <div className="library-table">
            <div className="library-header">
              <span>Title</span>
              <span>Author</span>
              <span>Type</span>
              <span>Status</span>
              <span>Visibility</span>
            </div>
            {libraryItems.map((item) => (
              <div key={item.id} className="library-row">
                <span>{item.title}</span>
                <span>{item.author}</span>
                <span>{item.type}</span>
                <span className={`submission-status-badge ${item.status}`}>{item.status}</span>
                <span>
                  <button
                    className={`visibility-toggle ${item.isPublic ? "public" : "private"}`}
                    onClick={() => toggleLibraryVisibility(item.id)}
                  >
                    {item.isPublic ? "Public" : "Private"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="principal-section">
        <h3>Reports</h3>

        <div className="report-subsection">
          <h4>Program Enrollment</h4>
          <div className="bar-chart">
            {enrollmentData.map((item) => (
              <div key={item.label} className="bar-row">
                <span className="bar-label">{item.label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(item.value / maxEnrollment) * 100}%` }}
                  ></div>
                </div>
                <span className="bar-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-subsection">
          <h4>Quick Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-number">{sightingCount}</span>
              <span className="summary-label">School Submissions This Term</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">{studentCount}</span>
              <span className="summary-label">Registered Students</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">{teachers.length}</span>
              <span className="summary-label">Active Teachers</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">3</span>
              <span className="summary-label">Active Programs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

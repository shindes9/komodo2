import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { seedAllData } from "../seedData";
import "./AdminDashboard.css";

/**
 * Admin (Superuser) Dashboard
 * 
 * Global Access: retrieves data from ALL schools and contributions
 * without any schoolId filter. Generates real "Business Analytics"
 * on popular programs, total sightings, contribution breakdowns.
 */

const placeholderCommunities = [
  { id: 1, name: "Labuan Bajo Community Watch", location: "Labuan Bajo, Flores", members: 34, status: "Active" },
  { id: 2, name: "Flores Conservation Network", location: "Ende, Flores", members: 22, status: "Active" },
  { id: 3, name: "Komodo Island Volunteers", location: "Komodo Island", members: 18, status: "Active" },
];

export default function AdminDashboard() {
  const { user, userData } = useAuth();
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [sightingCount, setSightingCount] = useState(0);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const [platformName, setPlatformName] = useState("Komodo Hub");
  const [contactEmail, setContactEmail] = useState("admin@komodohub.org");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [activeTab, setActiveTab] = useState("schools");
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const snapshot = await getDocs(collection(db, "schools"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSchools(data);
      } catch (err) {
        console.error("Error fetching schools:", err);
      } finally {
        setLoadingSchools(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, "classes"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClasses(data);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchContributions = async () => {
      try {
        const snapshot = await getDocs(collection(db, "contributions"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContributions(data);
      } catch (err) {
        console.error("Error fetching contributions:", err);
      } finally {
        setLoadingContributions(false);
      }
    };

    const fetchCounts = async () => {
      try {
        const sightingsSnap = await getDocs(collection(db, "sightings"));
        setSightingCount(sightingsSnap.size);

        const enrollmentsSnap = await getDocs(collection(db, "enrollments"));
        setEnrollmentCount(enrollmentsSnap.size);
        setEnrollments(enrollmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const messagesSnap = await getDocs(collection(db, "messages"));
        setMessageCount(messagesSnap.size);
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };

    fetchSchools();
    fetchUsers();
    fetchClasses();
    fetchContributions();
    fetchCounts();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    student: users.filter((u) => u.role === "student").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    principal: users.filter((u) => u.role === "principal").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  // ── REAL ANALYTICS from Firestore data ──

  // Contribution breakdown by type
  const contributionByType = useMemo(() => {
    const typeMap = {};
    contributions.forEach((c) => {
      const type = c.type || "Sighting Report";
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    return Object.entries(typeMap).map(([name, count]) => ({ name, count }));
  }, [contributions]);

  // Most popular programs (by real enrollment count)
  const popularPrograms = useMemo(() => {
    const programMap = {};
    enrollments.forEach((e) => {
      const pid = e.programId || "unknown";
      programMap[pid] = (programMap[pid] || 0) + 1;
    });

    const programNames = {
      komodo_dragon: "Komodo Dragon Conservation",
      sumatran_tiger: "Sumatran Tiger Watch",
      javan_rhino: "Javan Rhino Protection",
    };

    return Object.entries(programMap)
      .map(([id, count]) => ({ name: programNames[id] || id, enrollments: count }))
      .sort((a, b) => b.enrollments - a.enrollments);
  }, [enrollments]);

  // Per-school contribution count
  const schoolContributions = useMemo(() => {
    const schoolMap = {};
    contributions.forEach((c) => {
      const sid = c.schoolId || "unaffiliated";
      schoolMap[sid] = (schoolMap[sid] || 0) + 1;
    });

    return Object.entries(schoolMap).map(([schoolId, count]) => {
      const school = schools.find((s) => s.id === schoolId);
      return {
        schoolId,
        schoolName: school?.schoolName || schoolId,
        count,
      };
    }).sort((a, b) => b.count - a.count);
  }, [contributions, schools]);

  // Contribution status breakdown
  const statusBreakdown = useMemo(() => {
    const statusMap = { pending: 0, reviewed: 0, approved: 0 };
    contributions.forEach((c) => {
      const s = c.status || "pending";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    return statusMap;
  }, [contributions]);

  const maxProgEnrollment = Math.max(...(popularPrograms.length > 0 ? popularPrograms.map((p) => p.enrollments) : [1]));
  const maxContribType = Math.max(...(contributionByType.length > 0 ? contributionByType.map((c) => c.count) : [1]));

  const getSchoolName = (schoolId) => {
    const school = schools.find((s) => s.id === schoolId);
    return school ? school.schoolName : schoolId || "—";
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-welcome">
        <h2>Welcome back, {userData?.displayName || user?.email}</h2>
        <p className="admin-date">{today}</p>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-number">{schools.length}</div>
          <div className="stat-label">Schools</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-number">{placeholderCommunities.length}</div>
          <div className="stat-label">Communities</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-number">{contributions.length}</div>
          <div className="stat-label">Contributions</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">Sightings</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-number">{enrollmentCount}</div>
          <div className="stat-label">Enrollments</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">✉️</div>
          <div className="stat-number">{messageCount}</div>
          <div className="stat-label">Messages</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-number">{classes.length}</div>
          <div className="stat-label">Classes</div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === "schools" ? "active" : ""}`} onClick={() => setActiveTab("schools")}>Schools</button>
        <button className={`admin-tab ${activeTab === "classes" ? "active" : ""}`} onClick={() => setActiveTab("classes")}>Classes</button>
        <button className={`admin-tab ${activeTab === "contributions" ? "active" : ""}`} onClick={() => setActiveTab("contributions")}>Contributions</button>
        <button className={`admin-tab ${activeTab === "communities" ? "active" : ""}`} onClick={() => setActiveTab("communities")}>Communities</button>
        <button className={`admin-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>Users</button>
        <button className={`admin-tab ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>Analytics</button>
        <button className={`admin-tab ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>Settings</button>
      </div>

      {activeTab === "schools" && (
        <div className="admin-section">
          <h3>Manage Schools</h3>

          {loadingSchools ? (
            <p className="loading-text">Loading schools...</p>
          ) : schools.length === 0 ? (
            <div className="empty-state">
              <p>No schools registered on the platform yet.</p>
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header schools-grid">
                <span>School Name</span>
                <span>Location</span>
                <span>Principal</span>
                <span>Status</span>
              </div>
              {schools.map((school) => (
                <div key={school.id} className="admin-table-row schools-grid">
                  <span className="table-primary">{school.schoolName}</span>
                  <span>{school.location || "—"}</span>
                  <span>{school.principalId?.substring(0, 8) || "—"}...</span>
                  <span className="status-badge active">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "classes" && (
        <div className="admin-section">
          <h3>All Classes (Platform-wide)</h3>

          {loadingClasses ? (
            <p className="loading-text">Loading classes...</p>
          ) : classes.length === 0 ? (
            <div className="empty-state">
              <p>No classes created yet.</p>
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header classes-grid">
                <span>Class Name</span>
                <span>Program</span>
                <span>School</span>
                <span>Teacher</span>
              </div>
              {classes.map((cls) => (
                <div key={cls.id} className="admin-table-row classes-grid">
                  <span className="table-primary">{cls.className}</span>
                  <span>{cls.programId || "—"}</span>
                  <span>{getSchoolName(cls.schoolId)}</span>
                  <span>{cls.teacherId?.substring(0, 8) || "—"}...</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "contributions" && (
        <div className="admin-section">
          <h3>All Contributions (Platform-wide)</h3>

          {loadingContributions ? (
            <p className="loading-text">Loading contributions...</p>
          ) : contributions.length === 0 ? (
            <div className="empty-state">
              <p>No contributions yet.</p>
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header contributions-grid">
                <span>Title</span>
                <span>Type</span>
                <span>Student</span>
                <span>School</span>
                <span>Status</span>
              </div>
              {contributions.map((c) => (
                <div key={c.id} className="admin-table-row contributions-grid">
                  <span className="table-primary">{c.title || `${c.species} - ${c.location}`}</span>
                  <span>{c.type || "Sighting Report"}</span>
                  <span>{c.studentEmail || "—"}</span>
                  <span>{getSchoolName(c.schoolId)}</span>
                  <span className={`status-badge ${c.status === "reviewed" ? "reviewed" : c.status === "approved" ? "active" : "pending"}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "communities" && (
        <div className="admin-section">
          <h3>Manage Communities</h3>

          <div className="admin-table">
            <div className="admin-table-header communities-grid">
              <span>Community Name</span>
              <span>Location</span>
              <span>Members</span>
              <span>Status</span>
            </div>
            {placeholderCommunities.map((comm) => (
              <div key={comm.id} className="admin-table-row communities-grid">
                <span className="table-primary">{comm.name}</span>
                <span>{comm.location}</span>
                <span>{comm.members}</span>
                <span className="status-badge active">{comm.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="admin-section">
          <h3>User Management (All Users - Global)</h3>

          <div className="user-filters">
            <input
              className="user-search"
              type="text"
              placeholder="Search by email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="user-role-filter"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="student">Student ({roleCounts.student})</option>
              <option value="teacher">Teacher ({roleCounts.teacher})</option>
              <option value="principal">Principal ({roleCounts.principal})</option>
              <option value="admin">Admin ({roleCounts.admin})</option>
            </select>
          </div>

          {loadingUsers ? (
            <p className="loading-text">Loading users...</p>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header users-grid">
                <span>Email</span>
                <span>Role</span>
                <span>School</span>
                <span>Joined</span>
              </div>
              {filteredUsers.map((u) => (
                <div key={u.id} className="admin-table-row users-grid">
                  <span>{u.email}</span>
                  <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  <span>{getSchoolName(u.schoolId)}</span>
                  <span>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</span>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="admin-table-row users-grid">
                  <span className="no-results-text">No users found matching your filters.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="admin-section">
          <h3>Business Analytics</h3>
          <p className="analytics-description">
            Real-time analytics across all schools and contributions on the platform.
          </p>

          {/* Platform overview */}
          <div className="analytics-subsection">
            <h4>Platform Overview</h4>
            <div className="analytics-overview-grid">
              <div className="analytics-metric">
                <span className="metric-value">{contributions.length}</span>
                <span className="metric-label">Total Contributions</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{sightingCount}</span>
                <span className="metric-label">Total Sightings</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{enrollmentCount}</span>
                <span className="metric-label">Program Enrollments</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{messageCount}</span>
                <span className="metric-label">Messages Sent</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{statusBreakdown.pending || 0}</span>
                <span className="metric-label">Pending Reviews</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{statusBreakdown.reviewed || 0}</span>
                <span className="metric-label">Reviewed</span>
              </div>
            </div>
          </div>

          {/* Contribution by Type */}
          <div className="analytics-subsection">
            <h4>Contributions by Type</h4>
            {contributionByType.length === 0 ? (
              <p className="no-data-text">No contribution data yet.</p>
            ) : (
              <div className="program-bars">
                {contributionByType.map((ct) => (
                  <div key={ct.name} className="bar-row">
                    <span className="bar-label">{ct.name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill bar-fill-blue"
                        style={{ width: `${(ct.count / maxContribType) * 100}%` }}
                      ></div>
                    </div>
                    <span className="bar-value">{ct.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular Programs */}
          <div className="analytics-subsection">
            <h4>Most Popular Programs (by Enrollments)</h4>
            {popularPrograms.length === 0 ? (
              <p className="no-data-text">No enrollment data yet.</p>
            ) : (
              <div className="program-bars">
                {popularPrograms.map((p) => (
                  <div key={p.name} className="bar-row">
                    <span className="bar-label">{p.name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(p.enrollments / maxProgEnrollment) * 100}%` }}
                      ></div>
                    </div>
                    <span className="bar-value">{p.enrollments}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-school contributions */}
          <div className="analytics-subsection">
            <h4>Contributions by School</h4>
            {schoolContributions.length === 0 ? (
              <p className="no-data-text">No school contribution data yet.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header region-grid">
                  <span>School</span>
                  <span>Contributions</span>
                  <span>Share</span>
                </div>
                {schoolContributions.map((sc) => (
                  <div key={sc.schoolId} className="admin-table-row region-grid">
                    <span>{sc.schoolName}</span>
                    <span>{sc.count}</span>
                    <span>{contributions.length > 0 ? Math.round((sc.count / contributions.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Role Distribution */}
          <div className="analytics-subsection">
            <h4>User Role Distribution</h4>
            <div className="role-distribution">
              {Object.entries(roleCounts).map(([roleName, count]) => (
                <div key={roleName} className="role-dist-item">
                  <div className="role-dist-bar-bg">
                    <div
                      className={`role-dist-bar role-dist-${roleName}`}
                      style={{ width: `${users.length > 0 ? (count / users.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="role-dist-info">
                    <span className="role-dist-name">{roleName}</span>
                    <span className="role-dist-count">{count} ({users.length > 0 ? Math.round((count / users.length) * 100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="admin-section">
          <h3>System Settings</h3>

          <div className="settings-form">
            <div className="settings-row">
              <label className="settings-label">Platform Name</label>
              <input
                className="settings-input"
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div className="settings-row">
              <label className="settings-label">Contact Email</label>
              <input
                className="settings-input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div className="settings-row">
              <label className="settings-label">Maintenance Mode</label>
              <div className="toggle-container">
                <button
                  className={`toggle-btn ${maintenanceMode ? "toggle-on" : "toggle-off"}`}
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                >
                  <span className="toggle-knob"></span>
                </button>
                <span className="toggle-label">
                  {maintenanceMode ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <button className="settings-save-btn">Save Settings</button>

            <div className="seed-data-section">
              <h4>Demo Data</h4>
              <p className="seed-desc">Seed the database with sample species, programs, and library articles. Only seeds empty collections.</p>
              {seedMessage && <p className="seed-message">{seedMessage}</p>}
              <button
                className="seed-data-btn"
                disabled={seeding}
                onClick={async () => {
                  setSeeding(true);
                  setSeedMessage("");
                  try {
                    const results = await seedAllData();
                    setSeedMessage(results.join(" | "));
                  } catch (err) {
                    console.error("Seed error:", err);
                    setSeedMessage("Failed to seed data.");
                  } finally {
                    setSeeding(false);
                  }
                }}
              >
                {seeding ? "Seeding..." : "Seed Demo Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

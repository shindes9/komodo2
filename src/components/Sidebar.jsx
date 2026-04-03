import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

/**
 * Sidebar Navigation — RBAC-aware
 * 
 * Dynamically shows/hides tabs based on user role.
 * Public visitors: NO sidebar links.
 * Admin: NO messaging (platform-wide admin).
 * All logged-in roles get a "Public Library" link.
 */

/** Map role to its home dashboard path */
const roleDashboardPath = {
  student: "/student",
  teacher: "/teacher",
  principal: "/principal",
  chairman: "/community",
  member: "/member",
  admin: "/admin",
};

const navLinks = {
  student: [
    { label: "Dashboard", path: "/student", icon: "\u{1F3E0}", tooltip: "View your student dashboard" },
    { label: "My Programs", path: "/student/enrol", icon: "\u{1F4DA}", tooltip: "Browse and enrol in conservation programs" },
    { label: "My Work", path: "/student/sightings", icon: "\u{1F4DD}", tooltip: "Submit and view your conservation work" },
    { label: "Library", path: "/student/library", icon: "\u{1F4D6}", tooltip: "Browse your school's contribution library" },
    { label: "Messages", path: "/student/messages", icon: "\u{2709}\uFE0F", tooltip: "Message your school teachers and classmates" },
    { label: "Species Quiz", path: "/student/quiz", icon: "🎮", tooltip: "Test your species knowledge" },
    { label: "My Profile", path: "/student/profile", icon: "\u{1F464}", tooltip: "View and edit your profile" },
    { label: "Public Library", path: "/student/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher", icon: "\u{1F3E0}", tooltip: "View your teacher dashboard" },
    { label: "Sighting Reports", path: "/teacher/sightings", icon: "\u{1F50D}", tooltip: "Review student sighting reports" },
    { label: "School Library", path: "/teacher/library", icon: "\u{1F4D6}", tooltip: "Review student submissions from your school" },
    { label: "Messages", path: "/teacher/messages", icon: "\u{2709}\uFE0F", tooltip: "Message students and principal at your school" },
    { label: "My Profile", path: "/teacher/profile", icon: "\u{1F464}", tooltip: "View and edit your profile" },
    { label: "Public Library", path: "/teacher/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  principal: [
    { label: "Dashboard", path: "/principal", icon: "\u{1F3E0}", tooltip: "Manage your school overview" },
    { label: "School Library", path: "/principal/library", icon: "\u{1F4D6}", tooltip: "View all student contributions at your school" },
    { label: "Messages", path: "/principal/messages", icon: "\u{2709}\uFE0F", tooltip: "Message teachers at your school" },
    { label: "My Profile", path: "/principal/profile", icon: "\u{1F464}", tooltip: "View and edit your profile" },
    { label: "Public Library", path: "/principal/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  chairman: [
    { label: "Dashboard", path: "/community", icon: "\u{1F3E0}", tooltip: "Manage your community organization" },
    { label: "Community Library", path: "/community/library", icon: "\u{1F4D6}", tooltip: "View all member contributions" },
    { label: "Messages", path: "/community/messages", icon: "\u{2709}\uFE0F", tooltip: "Message community members" },
    { label: "Public Library", path: "/community/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  member: [
    { label: "Dashboard", path: "/member", icon: "\u{1F3E0}", tooltip: "View your member dashboard" },
    { label: "My Contributions", path: "/member/sightings", icon: "\u{1F4DD}", tooltip: "Submit articles and sighting reports" },
    { label: "Community Library", path: "/member/library", icon: "\u{1F4D6}", tooltip: "Browse your community's contribution library" },
    { label: "My Profile", path: "/member/profile", icon: "\u{1F464}", tooltip: "View and edit your public profile" },
    { label: "Messages", path: "/member/messages", icon: "\u{2709}\uFE0F", tooltip: "Message community members" },
    { label: "Public Library", path: "/member/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  admin: [
    { label: "Dashboard", path: "/admin", icon: "\u{1F3E0}", tooltip: "Platform-wide admin dashboard" },
    { label: "My Profile", path: "/admin/profile", icon: "\u{1F464}", tooltip: "View and edit your profile" },
    { label: "Public Library", path: "/admin/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

  const links = navLinks[role] || [];
  const homePath = roleDashboardPath[role] || "/";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="sidebar">
      <div
        className="sidebar-header"
        onClick={() => navigate(homePath)}
        style={{ cursor: "pointer" }}
        title="Go to Dashboard"
      >
        <div className="sidebar-logo">K</div>
        <span className="sidebar-title">Komodo Hub</span>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <button
            key={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "sidebar-link-active" : ""}`}
            onClick={() => navigate(link.path)}
            title={link.tooltip}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <span className="sidebar-role-badge">{role}</span>
          <div className="sidebar-user-email">{user?.email}</div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

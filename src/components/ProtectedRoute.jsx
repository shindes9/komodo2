import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Maps each role to its home dashboard path
const ROLE_HOME = {
  student: "/student",
  teacher: "/teacher",
  principal: "/principal",
  admin: "/admin",
  chairman: "/community",
  member: "/member",
  public: "/library",
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the user's own dashboard instead of showing "Access Denied"
    const redirect = role ? (ROLE_HOME[role] || "/") : "/";
    return <Navigate to={redirect} replace />;
  }

  return children;
}

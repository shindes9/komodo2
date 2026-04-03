import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column" }}>
        <h2 style={{ color: "#c62828" }}>Access Denied</h2>
        <p style={{ color: "#555" }}>You do not have permission to view this page.</p>
        <p style={{ color: "#888", fontSize: 14 }}>Your role: {role || "none"}</p>
      </div>
    );
  }

  return children;
}

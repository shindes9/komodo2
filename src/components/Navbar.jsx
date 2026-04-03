import { useAuth } from "../context/AuthContext";
import Notifications from "./Notifications";
import "./Navbar.css";

export default function Navbar({ title }) {
  const { user, userData, role } = useAuth();

  return (
    <div className="navbar">
      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-right">
        <Notifications />
        <span className="navbar-role-badge">{role}</span>
        <span className="navbar-email">{userData?.displayName || user?.email}</span>
      </div>
    </div>
  );
}

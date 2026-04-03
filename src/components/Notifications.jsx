import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import "./Notifications.css";

export default function Notifications() {
  const { user, schoolId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(data);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only count unread notifications that belong to the user's own school
  // (or notifications with no schoolId, e.g. system notifications)
  const unreadCount = notifications.filter((n) => {
    if (n.read) return false;
    if (schoolId && n.schoolId && n.schoolId !== schoolId) return false;
    return true;
  }).length;

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  return (
    <div className="notifications-wrapper" ref={ref}>
      <button
        className="notifications-bell"
        onClick={() => setOpen(!open)}
      >
        <span className="bell-icon">&#128276;</span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <span className="notifications-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  className={`notification-item ${!n.read ? "notification-unread" : ""}`}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                  }}
                >
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">
                    {n.createdAt?.toDate
                      ? n.createdAt.toDate().toLocaleDateString()
                      : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

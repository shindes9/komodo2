import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  or,
} from "firebase/firestore";
import { createNotification } from "../utils/notifications";
import "./Messages.css";

/**
 * RBAC-enforced Internal Messaging System
 * 
 * Students: Can only message teachers & students within the same classId + schoolId
 * Teachers: Can message students in their classes + the principal of their school
 * Principal: Can message teachers in their school
 * Security: Cross-school messaging is blocked. Public visitors have zero access.
 */
export default function Messages() {
  const { user, role, schoolId, classIds } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [showNewChat, setShowNewChat] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Cache of validated receiver schoolIds for cross-school check
  const [contactSchoolMap, setContactSchoolMap] = useState({});

  const messagesEndRef = useRef(null);

  // ──────────────────────────────────────────────────────────────
  // Block public/community visitors entirely
  // ──────────────────────────────────────────────────────────────
  const isBlocked = !user || role === "public" || role === "community";

  // ──────────────────────────────────────────────────────────────
  // Real-time message listener
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isBlocked) return;

    const q = query(
      collection(db, "messages"),
      or(
        where("senderId", "==", user.uid),
        where("receiverId", "==", user.uid)
      ),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Build conversation list grouped by other user
      const convMap = {};
      allMessages.forEach((msg) => {
        const otherId = msg.senderId === user.uid ? msg.receiverId : msg.senderId;
        const otherEmail = msg.senderId === user.uid ? msg.receiverEmail : msg.senderEmail;
        const otherRole = msg.senderId === user.uid ? msg.receiverRole : msg.senderRole;

        if (!convMap[otherId]) {
          convMap[otherId] = {
            userId: otherId,
            email: otherEmail || otherId,
            role: otherRole || "",
            lastMessage: msg.content || msg.text || "",
            lastTimestamp: msg.timestamp,
            unread: 0,
          };
        } else {
          convMap[otherId].lastMessage = msg.content || msg.text || "";
          convMap[otherId].lastTimestamp = msg.timestamp;
        }

        if (msg.receiverId === user.uid && !msg.read) {
          convMap[otherId].unread += 1;
        }
      });

      const convList = Object.values(convMap).sort((a, b) => {
        const ta = a.lastTimestamp?.seconds || 0;
        const tb = b.lastTimestamp?.seconds || 0;
        return tb - ta;
      });

      setConversations(convList);

      // Update messages for selected conversation
      if (selectedUserId) {
        const filtered = allMessages.filter(
          (m) =>
            (m.senderId === user.uid && m.receiverId === selectedUserId) ||
            (m.senderId === selectedUserId && m.receiverId === user.uid)
        );
        setMessages(filtered);
      }
    });

    return () => unsub();
  }, [user, selectedUserId, isBlocked]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ──────────────────────────────────────────────────────────────
  // RBAC Contact Loading
  // ──────────────────────────────────────────────────────────────
  const loadAvailableContacts = useCallback(async () => {
    setLoadingContacts(true);
    setAvailableContacts([]);
    setSendError("");

    try {
      if (!schoolId) {
        setAvailableContacts([]);
        setLoadingContacts(false);
        return;
      }

      let contacts = [];
      const schoolMap = {};

      if (role === "student") {
        // ── STUDENT RBAC ──
        // Can message: teachers in same school + students in same classes
        const teacherContactIds = new Set();
        const studentContactIds = new Set();

        // 1. Get teachers from same school
        const teacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const teacherSnap = await getDocs(teacherQ);
        teacherSnap.docs.forEach((d) => {
          if (d.id !== user.uid) {
            teacherContactIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.email, role: "teacher", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });

        // 2. Get students from same classes
        if (classIds && classIds.length > 0) {
          for (const classId of classIds) {
            const memberQ = query(
              collection(db, "classMembers"),
              where("classId", "==", classId)
            );
            const memberSnap = await getDocs(memberQ);
            for (const memberDoc of memberSnap.docs) {
              const memberData = memberDoc.data();
              const studentId = memberData.studentId;
              if (studentId !== user.uid && !teacherContactIds.has(studentId) && !studentContactIds.has(studentId)) {
                studentContactIds.add(studentId);
                // Fetch user doc for email and schoolId
                const userDoc = await getDoc(doc(db, "users", studentId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  // Only add if same school
                  if (userData.schoolId === schoolId) {
                    contacts.push({ id: studentId, email: userData.email, role: "student", schoolId: userData.schoolId });
                    schoolMap[studentId] = userData.schoolId;
                  }
                }
              }
            }
          }
        }
      } else if (role === "teacher") {
        // ── TEACHER RBAC ──
        // Can message: students in their classes + the principal of their school
        const addedIds = new Set();

        // 1. Get students from teacher's classes
        if (classIds && classIds.length > 0) {
          for (const classId of classIds) {
            const memberQ = query(
              collection(db, "classMembers"),
              where("classId", "==", classId)
            );
            const memberSnap = await getDocs(memberQ);
            for (const memberDoc of memberSnap.docs) {
              const memberData = memberDoc.data();
              const studentId = memberData.studentId;
              if (studentId !== user.uid && !addedIds.has(studentId)) {
                addedIds.add(studentId);
                const userDoc = await getDoc(doc(db, "users", studentId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  if (userData.schoolId === schoolId) {
                    contacts.push({ id: studentId, email: userData.email, role: "student", schoolId: userData.schoolId });
                    schoolMap[studentId] = userData.schoolId;
                  }
                }
              }
            }
          }
        }

        // 2. Get the principal of their school
        const principalQ = query(
          collection(db, "users"),
          where("role", "==", "principal"),
          where("schoolId", "==", schoolId)
        );
        const principalSnap = await getDocs(principalQ);
        principalSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.email, role: "principal", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });

        // Also let teachers message other teachers in same school
        const otherTeacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const otherTeacherSnap = await getDocs(otherTeacherQ);
        otherTeacherSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.email, role: "teacher", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });
      } else if (role === "principal") {
        // ── PRINCIPAL RBAC ──
        // Can message: all teachers in their school
        const schoolUsersQ = query(
          collection(db, "users"),
          where("schoolId", "==", schoolId),
          where("role", "==", "teacher")
        );
        const snapshot = await getDocs(schoolUsersQ);
        contacts = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== user.uid);
        contacts.forEach((c) => { schoolMap[c.id] = c.schoolId; });
      }

      setContactSchoolMap(schoolMap);
      setAvailableContacts(contacts);
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setLoadingContacts(false);
    }
  }, [user, role, schoolId, classIds]);

  // ──────────────────────────────────────────────────────────────
  // Conversation selection
  // ──────────────────────────────────────────────────────────────
  const selectConversation = (conv) => {
    setSelectedUserId(conv.userId);
    setSelectedUserEmail(conv.email);
    setSelectedUserRole(conv.role || "");
    setShowNewChat(false);
    setSendError("");
  };

  const handleToggleNewChat = () => {
    const next = !showNewChat;
    setShowNewChat(next);
    if (next) {
      loadAvailableContacts();
    }
  };

  const startConversation = (foundUser) => {
    setSelectedUserId(foundUser.id);
    setSelectedUserEmail(foundUser.email);
    setSelectedUserRole(foundUser.role || "");
    setShowNewChat(false);
    setAvailableContacts([]);
    setSendError("");
  };

  // ──────────────────────────────────────────────────────────────
  // RBAC Validation before sending
  // ──────────────────────────────────────────────────────────────
  const validateSend = async (receiverId) => {
    // 1. Block public/community users
    if (!user || role === "public" || role === "community") {
      return "You do not have permission to send messages.";
    }

    // 2. Cannot message yourself
    if (receiverId === user.uid) {
      return "You cannot send a message to yourself.";
    }

    // 3. Fetch receiver data for cross-school check
    let receiverSchoolId = contactSchoolMap[receiverId];
    if (!receiverSchoolId) {
      try {
        const receiverDoc = await getDoc(doc(db, "users", receiverId));
        if (receiverDoc.exists()) {
          receiverSchoolId = receiverDoc.data().schoolId;
        }
      } catch (err) {
        return "Unable to verify recipient. Please try again.";
      }
    }

    // 4. Cross-school block: sender.schoolId !== receiver.schoolId
    if (schoolId && receiverSchoolId && schoolId !== receiverSchoolId) {
      return "You cannot send messages to users outside your school.";
    }

    // 5. Role-based restrictions
    if (role === "student") {
      // Students: only message teachers + students in same class & school
      // We already filtered contacts in loadAvailableContacts, but double-check
      const isValidContact = availableContacts.some((c) => c.id === receiverId) ||
        conversations.some((c) => c.userId === receiverId);
      if (!isValidContact) {
        // Do a deeper check
        const receiverDoc = await getDoc(doc(db, "users", receiverId));
        if (receiverDoc.exists()) {
          const recData = receiverDoc.data();
          if (recData.schoolId !== schoolId) {
            return "You cannot message users outside your school.";
          }
          if (recData.role !== "teacher" && recData.role !== "student") {
            return "Students can only message teachers and other students in their classes.";
          }
        }
      }
    }

    return null; // All good
  };

  // ──────────────────────────────────────────────────────────────
  // Send Message
  // ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    setSending(true);
    setSendError("");

    try {
      // Validate RBAC
      const validationError = await validateSend(selectedUserId);
      if (validationError) {
        setSendError(validationError);
        setSending(false);
        return;
      }

      // Find the classId for this conversation (if applicable)
      let messageClassId = null;
      if (classIds && classIds.length > 0) {
        // Use the first shared class if any
        messageClassId = classIds[0];
      }

      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: role,
        receiverId: selectedUserId,
        receiverEmail: selectedUserEmail,
        receiverRole: selectedUserRole,
        schoolId: schoolId || null,
        classId: messageClassId,
        content: newMessage.trim(),
        text: newMessage.trim(), // backward compat
        timestamp: serverTimestamp(),
        read: false,
      });

      createNotification(selectedUserId, `New message from ${user.email}`);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeClass = (r) => {
    if (r === "teacher") return "role-badge-teacher";
    if (r === "principal") return "role-badge-principal";
    if (r === "student") return "role-badge-student";
    return "role-badge-default";
  };

  const backPath =
    role === "teacher" ? "/teacher" :
    role === "principal" ? "/principal" :
    "/student";

  // ──────────────────────────────────────────────────────────────
  // Block render for public visitors
  // ──────────────────────────────────────────────────────────────
  if (isBlocked) {
    return (
      <div className="messages-page">
        <div className="messages-blocked">
          <div className="blocked-icon">🔒</div>
          <h3>Access Denied</h3>
          <p>The messaging system is only available to authenticated school members (students, teachers, and principals).</p>
          <p className="blocked-note">Public visitors do not have access to internal messaging or student profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="messages-sidebar">
          <div className="messages-sidebar-header">
            <button
              className="messages-back-btn"
              onClick={() => navigate(backPath)}
              title="Back to Dashboard"
            >
              Back
            </button>
            <h3>Messages</h3>
            <button
              className="new-chat-btn"
              onClick={handleToggleNewChat}
              title="Start a new conversation"
            >
              +
            </button>
          </div>

          <div className="messages-security-notice">
            <span className="security-icon">🔒</span>
            {role === "student" && (
              <span>You can message teachers and classmates within your school.</span>
            )}
            {role === "teacher" && (
              <span>You can message your students and the school principal.</span>
            )}
            {role === "principal" && (
              <span>You can message teachers at your school.</span>
            )}
          </div>

          {showNewChat && (
            <div className="new-chat-section">
              <p className="new-chat-label">
                {role === "student"
                  ? "Teachers & Classmates:"
                  : role === "teacher"
                  ? "Students & Staff:"
                  : "School Teachers:"}
              </p>
              {loadingContacts ? (
                <p className="loading-text">Loading contacts...</p>
              ) : availableContacts.length === 0 ? (
                <p className="no-results-text">
                  {role === "student"
                    ? "No contacts found. Make sure you're enrolled in a class."
                    : "No contacts found at your school."}
                </p>
              ) : (
                availableContacts.map((r) => (
                  <button
                    key={r.id}
                    className="search-result-btn"
                    onClick={() => startConversation(r)}
                  >
                    <span>{r.email}</span>
                    <span className={`search-result-role ${getRoleBadgeClass(r.role)}`}>
                      {r.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="conversations-list">
            {conversations.length === 0 && (
              <p className="no-conversations">No conversations yet.</p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                className={`conversation-item ${selectedUserId === conv.userId ? "conversation-active" : ""}`}
                onClick={() => selectConversation(conv)}
              >
                <div className="conversation-avatar">
                  {(conv.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="conversation-info">
                  <div className="conversation-email">{conv.email}</div>
                  <div className="conversation-preview">{conv.lastMessage}</div>
                </div>
                <div className="conversation-meta">
                  {conv.role && (
                    <span className={`conv-role-badge ${getRoleBadgeClass(conv.role)}`}>
                      {conv.role}
                    </span>
                  )}
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="messages-main">
          {!selectedUserId ? (
            <div className="no-chat-selected">
              <div className="no-chat-icon">✉️</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the left panel or start a new one.</p>
              <div className="rbac-info-box">
                <h4>Messaging Rules:</h4>
                <ul>
                  <li>Messages are restricted to your school only</li>
                  <li>Students can message their teachers and classmates</li>
                  <li>Teachers can message their students and the principal</li>
                  <li>Cross-school messaging is not permitted</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-header-avatar">
                  {selectedUserEmail.charAt(0).toUpperCase()}
                </div>
                <div className="chat-header-info">
                  <span className="chat-header-email">{selectedUserEmail}</span>
                  {selectedUserRole && (
                    <span className={`chat-header-role ${getRoleBadgeClass(selectedUserRole)}`}>
                      {selectedUserRole}
                    </span>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="no-messages">No messages yet. Say hello!</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${msg.senderId === user.uid ? "chat-bubble-sent" : "chat-bubble-received"}`}
                  >
                    <div className="bubble-text">{msg.content || msg.text}</div>
                    <div className="bubble-time">{formatTime(msg.timestamp)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <div className="send-error-bar">
                  <span className="send-error-icon">⚠️</span>
                  <span>{sendError}</span>
                </div>
              )}

              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); setSendError(""); }}
                  onKeyDown={handleKeyDown}
                  className="chat-input"
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

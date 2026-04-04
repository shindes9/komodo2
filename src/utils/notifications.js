import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

/**
 * Creates a notification document in Firestore for a given recipient.
 *
 * Schema:
 *   recipientId  : string  — UID of the recipient (required)
 *   senderId     : string  — UID of the sender (for read-trigger matching)
 *   message      : string  — human-readable notification text
 *   type         : string  — 'message' | 'feedback' | 'published' | 'system'
 *   isRead       : boolean — false by default (used by badge query)
 *   schoolId     : string? — Walled-garden isolation field
 *   orgId        : string? — Community isolation field
 *   createdAt    : Timestamp
 */
export async function createNotification(
  recipientId,
  message,
  schoolId = null,
  {
    type = "system",
    senderId = null,
    orgId = null,
  } = {}
) {
  if (!recipientId) return;

  // Walled-garden: never create cross-org notifications
  // (callers are responsible for passing the correct schoolId/orgId)
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      message,
      type,
      senderId,
      isRead: false,
      // Legacy field kept for any existing queries still using 'read'
      read: false,
      createdAt: serverTimestamp(),
      ...(schoolId ? { schoolId } : {}),
      ...(orgId ? { orgId } : {}),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

/**
 * Marks all unread notifications for a user as read in a single atomic batch.
 * Returns the number of documents updated.
 */
export async function markAllNotificationsRead(userId) {
  if (!userId) return 0;
  try {
    // Query all unread notifications for this user
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    // Batch write — Firestore limit is 500 ops per batch
    const batches = [];
    let batch = writeBatch(db);
    let opCount = 0;

    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
      opCount++;
      if (opCount === 499) {
        batches.push(batch);
        batch = writeBatch(db);
        opCount = 0;
      }
    });
    batches.push(batch);

    await Promise.all(batches.map((b) => b.commit()));

    // Also mark all actual messages for this user as read
    try {
      const msgQ = query(
        collection(db, "messages"),
        where("receiverId", "==", userId),
        where("read", "==", false)
      );
      const msgSnap = await getDocs(msgQ);
      if (!msgSnap.empty) {
        const msgBatches = [];
        let msgBatch = writeBatch(db);
        let msgOpCount = 0;
        msgSnap.docs.forEach((d) => {
          msgBatch.update(doc(db, "messages", d.id), { read: true });
          msgOpCount++;
          if (msgOpCount === 499) {
            msgBatches.push(msgBatch);
            msgBatch = writeBatch(db);
            msgOpCount = 0;
          }
        });
        msgBatches.push(msgBatch);
        await Promise.all(msgBatches.map((b) => b.commit()));
      }
    } catch (err) {
      console.error("Error marking all real messages as read:", err);
    }

    return snap.size;
  } catch (err) {
    console.error("Error marking all notifications read:", err);
    return 0;
  }
}

/**
 * Marks all unread MESSAGE notifications from a specific sender as read.
 * Call this when a user opens a conversation with `otherUserId`.
 */
export async function markMessageNotificationsRead(recipientId, senderId) {
  if (!recipientId || !senderId) return;
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", recipientId),
      where("senderId", "==", senderId),
      where("type", "==", "message"),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
    });
    await batch.commit();

    // Also mark actual messages from this sender as read
    try {
      const msgQ = query(
        collection(db, "messages"),
        where("receiverId", "==", recipientId),
        where("senderId", "==", senderId),
        where("read", "==", false)
      );
      const msgSnap = await getDocs(msgQ);
      if (!msgSnap.empty) {
        const msgBatch = writeBatch(db);
        msgSnap.docs.forEach((d) => {
          msgBatch.update(doc(db, "messages", d.id), { read: true });
        });
        await msgBatch.commit();
      }
    } catch (err) {
      console.error("Error marking real messages as read:", err);
    }
  } catch (err) {
    console.error("Error marking message notifications read:", err);
  }
}

/**
 * Marks feedback notifications for a specific contribution as read.
 * Call this when a student opens a submission's detail/feedback modal.
 */
export async function markFeedbackNotificationRead(recipientId, contributionId) {
  if (!recipientId || !contributionId) return;
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", recipientId),
      where("contributionId", "==", contributionId),
      where("type", "==", "feedback"),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error marking feedback notification read:", err);
  }
}

import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Creates a notification document in Firestore for a given recipient.
 * @param {string} recipientId - The UID of the notification recipient.
 * @param {string} message - The notification message text.
 * @param {string|null} schoolId - The schoolId of the sender for walled-garden filtering.
 */
export async function createNotification(recipientId, message, schoolId = null) {
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      message,
      read: false,
      createdAt: serverTimestamp(),
      ...(schoolId ? { schoolId } : {}),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

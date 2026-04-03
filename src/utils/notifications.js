import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Creates a notification document in Firestore for a given recipient.
 * @param {string} recipientId - The UID of the notification recipient.
 * @param {string} message - The notification message text.
 */
export async function createNotification(recipientId, message) {
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

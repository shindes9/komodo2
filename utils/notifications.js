import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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

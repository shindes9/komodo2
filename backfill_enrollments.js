import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import fs from "fs";

// Read firebase.js to get the config
const fileData = fs.readFileSync("./src/firebase.js", "utf8");

const apiKeyMatch = fileData.match(/apiKey:\s*"(.*?)"/);
const authDomainMatch = fileData.match(/authDomain:\s*"(.*?)"/);
const projectIdMatch = fileData.match(/projectId:\s*"(.*?)"/);
const storageBucketMatch = fileData.match(/storageBucket:\s*"(.*?)"/);
const messagingSenderIdMatch = fileData.match(/messagingSenderId:\s*"(.*?)"/);
const appIdMatch = fileData.match(/appId:\s*"(.*?)"/);

const firebaseConfig = {
  apiKey: apiKeyMatch[1],
  authDomain: authDomainMatch[1],
  projectId: projectIdMatch[1],
  storageBucket: storageBucketMatch[1],
  messagingSenderId: messagingSenderIdMatch[1],
  appId: appIdMatch[1]
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfill() {
  const enrolQ = await getDocs(collection(db, "enrollments"));
  let updated = 0;
  for (const docSnap of enrolQ.docs) {
    const data = docSnap.data();
    if (!data.schoolId && !data.orgId) {
      const uid = data.userId || data.studentId;
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.schoolId || userData.orgId) {
            await updateDoc(docSnap.ref, {
              schoolId: userData.schoolId || null,
              orgId: userData.orgId || null
            });
            updated++;
          }
        }
      }
    }
  }
  console.log(`Backfilled ${updated} enrollment documents.`);
}

backfill().catch(console.error).then(() => process.exit(0));

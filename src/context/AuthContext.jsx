import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [classIds, setClassIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track the real-time user document listener so we can clean it up
    let userDocUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous user-document listener when auth state changes
      if (userDocUnsub) {
        userDocUnsub();
        userDocUnsub = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setUserData(null);
        setRole(null);
        setSchoolId(null);
        setOrgId(null);
        setClassIds([]);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // Use onSnapshot instead of getDoc so we:
      // 1. Handle the registration race condition (doc may not exist yet when
      //    onAuthStateChanged fires during sign-up — we simply wait until it appears)
      // 2. Automatically pick up schoolId updates (e.g. principal sets up school)
      const userRef = doc(db, "users", firebaseUser.uid);

      // Safety timeout: if the Firestore doc never appears (orphaned auth account),
      // sign the user out after 5 seconds to avoid an infinite loading spinner.
      let orphanTimer = null;

      userDocUnsub = onSnapshot(
        userRef,
        async (userSnap) => {
          if (!userSnap.exists()) {
            // Document is being created (registration race) — start orphan safety timer
            if (!orphanTimer) {
              orphanTimer = setTimeout(async () => {
                console.warn("AuthContext: user doc not found after 5s — signing out orphaned auth account.");
                try { await signOut(auth); } catch (_) { /* ignore */ }
                setUser(null);
                setUserData(null);
                setRole(null);
                setSchoolId(null);
                setOrgId(null);
                setClassIds([]);
                setLoading(false);
              }, 5000);
            }
            return;
          }

          // Doc found — cancel the orphan timer if it was set
          if (orphanTimer) {
            clearTimeout(orphanTimer);
            orphanTimer = null;
          }

          const data = userSnap.data();
          
          // Dual-Wait: Ensure the document has actually populated with core attributes
          if (!data.role) {
            return;
          }
          const userRole = data.role || null;
          const userSchoolId = data.schoolId || null;
          const userOrgId = data.orgId || null;

          setUserData(data);
          setRole(userRole);
          setSchoolId(userSchoolId);
          setOrgId(userOrgId);

          // Fetch class membership based on role
          try {
            let fetchedClassIds = [];
            if (userRole === "student") {
              const memberQ = query(
                collection(db, "classMembers"),
                where("studentId", "==", firebaseUser.uid)
              );
              const memberSnap = await getDocs(memberQ);
              fetchedClassIds = memberSnap.docs.map((d) => d.data().classId);
            } else if (userRole === "teacher") {
              const classQ = query(
                collection(db, "classes"),
                where("teacherId", "==", firebaseUser.uid)
              );
              const classSnap = await getDocs(classQ);
              fetchedClassIds = classSnap.docs.map((d) => d.id);
            }
            setClassIds(fetchedClassIds);
          } catch (error) {
            console.error("Failed to load class IDs:", error);
            setClassIds([]);
          }

          setLoading(false);
        },
        (error) => {
          console.error("User document listener error:", error);
          if (orphanTimer) { clearTimeout(orphanTimer); orphanTimer = null; }
          setUserData(null);
          setRole(null);
          setSchoolId(null);
          setOrgId(null);
          setClassIds([]);
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (userDocUnsub) userDocUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      role,
      schoolId,
      orgId,
      classIds,
      loading,
      // Convenience shortcut: displayName resolves to Firestore displayName,
      // falls back to Firebase Auth displayName, then email prefix.
      displayName: userData?.displayName || user?.displayName || user?.email?.split("@")[0] || null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

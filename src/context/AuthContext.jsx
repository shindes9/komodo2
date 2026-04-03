import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [classIds, setClassIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setRole(null);
        setSchoolId(null);
        setOrgId(null);
        setClassIds([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const userRole = data.role || null;
          const userSchoolId = data.schoolId || null;
          const userOrgId = data.orgId || null;
          setRole(userRole);
          setSchoolId(userSchoolId);
          setOrgId(userOrgId);

          // Fetch classIds based on role
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
        } else {
          setRole(null);
          setSchoolId(null);
          setOrgId(null);
          setClassIds([]);
        }
      } catch (error) {
        console.error("Failed to load user role:", error);
        setRole(null);
        setSchoolId(null);
        setOrgId(null);
        setClassIds([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, schoolId, orgId, classIds, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

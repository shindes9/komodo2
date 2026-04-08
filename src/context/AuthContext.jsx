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
    
    let userDocUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      
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

      
      
      
      
      const userRef = doc(db, "users", firebaseUser.uid);

      
      
      let orphanTimer = null;

      userDocUnsub = onSnapshot(
        userRef,
        async (userSnap) => {
          if (!userSnap.exists()) {
            
            if (!orphanTimer) {
              orphanTimer = setTimeout(async () => {
                console.warn("AuthContext: user doc not found after 5s — signing out orphaned auth account.");
                try { await signOut(auth); } catch (_) {  }
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

          
          if (orphanTimer) {
            clearTimeout(orphanTimer);
            orphanTimer = null;
          }

          const data = userSnap.data();
          
          
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

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      role,
      schoolId,
      orgId,
      classIds,
      loading,
      logout,
      
      
      displayName: userData?.displayName || user?.displayName || user?.email?.split("@")[0] || null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgType, setOrgType] = useState("student");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [orgTypeError, setOrgTypeError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const rememberedEmailKey = "komodoHub.rememberedEmail";

  const normalizeEmail = (emailValue) =>
    String(emailValue || "").trim().toLowerCase();

  useEffect(() => {
    const savedEmail = localStorage.getItem(rememberedEmailKey);

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");
  }, []);

  const routeByType = (type) => {
    const t = String(type || "").trim().toLowerCase();

    if (t === "student") {
      navigate("/enrol", { replace: true });
      return true;
    }

    if (t === "public" || t === "community") {
      navigate("/library", { replace: true });
      return true;
    }

    if (t === "teacher") {
      navigate("/teacher", { replace: true });
      return true;
    }

    if (t === "principal") {
      navigate("/principal", { replace: true });
      return true;
    }

    if (t === "admin") {
      navigate("/admin", { replace: true });
      return true;
    }

    if (t === "chairman") {
      navigate("/chairman", { replace: true });
      return true;
    }

    return false;
  };

  const clearFeedback = () => {
    setMessage("");
    setMessageType("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");
  };

  const resetSensitiveFields = () => {
    setPassword("");
    setConfirmPassword("");
    clearFeedback();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetSensitiveFields();

    if (!rememberMe) {
      setEmail("");
    }
  };

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const isValidEmailFormat = (value) => {
    const trimmed = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const validateForm = () => {
    let valid = true;
    const cleanEmail = normalizeEmail(email);

    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");

    if (!cleanEmail) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!isValidEmailFormat(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (mode === "register" && password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    if (mode === "register") {
      if (!confirmPassword.trim()) {
        setConfirmPasswordError("Please confirm your password.");
        valid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match.");
        valid = false;
      }
    }

    if (!orgType.trim()) {
      setOrgTypeError("Please select an account type.");
      valid = false;
    }

    if (!valid) {
      showMessage("Please fix the highlighted fields.", "error");
    }

    return valid;
  };

  const persistRememberedEmail = (emailValue) => {
    if (rememberMe) {
      localStorage.setItem(rememberedEmailKey, normalizeEmail(emailValue));
    } else {
      localStorage.removeItem(rememberedEmailKey);
    }
  };

  const mapFirebaseError = (err, currentMode) => {
    const code = err?.code || "";

    switch (code) {
      case "auth/invalid-email":
        setEmailError("Please enter a valid email address.");
        return "The email address format is invalid.";

      case "auth/user-not-found":
        setEmailError("This email is not registered.");
        return "No account was found for this email.";

      case "auth/wrong-password":
        setPasswordError("Incorrect password.");
        return "Incorrect password.";

      case "auth/invalid-credential":
        setEmailError("Email or password is incorrect.");
        setPasswordError("Email or password is incorrect.");
        return "Email or password is incorrect.";

      case "auth/email-already-in-use":
        setEmailError("This email is already registered.");
        return "This email is already registered.";

      case "auth/weak-password":
        setPasswordError("Password should be at least 6 characters.");
        return "Password should be at least 6 characters.";

      case "auth/missing-password":
        setPasswordError("Password is required.");
        return "Password is required.";

      default:
        return currentMode === "register"
          ? "Registration failed. Please try again."
          : "Login failed. Please try again.";
    }
  };

  const register = async () => {
    clearFeedback();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanEmail = normalizeEmail(email);
      const cleanRole = String(orgType).trim().toLowerCase();

      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await setDoc(doc(db, "users", credential.user.uid), {
        email: cleanEmail,
        role: cleanRole,
        createdAt: serverTimestamp(),
      });

      persistRememberedEmail(cleanEmail);
      setPassword("");
      setConfirmPassword("");

      if (routeByType(cleanRole)) return;

      showMessage(`Successfully registered as ${cleanRole}.`, "success");
    } catch (err) {
      const friendlyMessage = mapFirebaseError(err, "register");
      showMessage(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    clearFeedback();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanEmail = normalizeEmail(email);
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      persistRememberedEmail(cleanEmail);

      const userRef = doc(db, "users", credential.user.uid);
      const userSnap = await getDoc(userRef);

      let role = String(orgType).trim().toLowerCase();

      if (userSnap.exists()) {
        role = userSnap.data().role || role;
      } else {
        await setDoc(userRef, {
          email: cleanEmail,
          role,
          createdAt: serverTimestamp(),
        });
      }

      setPassword("");
      setConfirmPassword("");

      if (routeByType(role)) return;

      showMessage("Logged in successfully.", "success");
    } catch (err) {
      const friendlyMessage = mapFirebaseError(err, "login");
      showMessage(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    display: "block",
    boxSizing: "border-box",
    padding: 13,
    borderRadius: 12,
    border: "1px solid #d7e3d9",
    outline: "none",
    background: "#fff",
    color: "#111",
    marginBottom: 6,
    fontSize: 15,
  };

  const errorTextStyle = {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 10,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        boxSizing: "border-box",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: "min(460px, 92vw)",
          padding: 30,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderRadius: 24,
          boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
          border: "1px solid rgba(46,125,50,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              margin: "0 auto 14px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #2E7D32, #66BB6A)",
              color: "#fff",
              fontSize: 28,
              boxShadow: "0 10px 24px rgba(46,125,50,0.25)",
            }}
          >
            K
          </div>
          <h2 style={{ color: "#1b4332", margin: 0 }}>Komodo Hub</h2>
          <p style={{ color: "#4f6f52", marginBottom: 0 }}>
            Learn, connect, and protect endangered wildlife
          </p>
        </div>

        {message && (
          <div
            style={{
              background: messageType === "success" ? "#edf9ee" : "#fff1f1",
              padding: 12,
              marginBottom: 14,
              border:
                messageType === "success"
                  ? "1px solid #7bc47f"
                  : "1px solid #d98383",
              borderRadius: 12,
              color: "#223",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 18,
            background: "#f4f8f4",
            borderRadius: 14,
            padding: 6,
          }}
        >
          <button
            type="button"
            onClick={() => switchMode("login")}
            disabled={mode === "login" || loading}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 10,
              border: "none",
              background: mode === "login" ? "#2E7D32" : "transparent",
              color: mode === "login" ? "#fff" : "#1b4332",
              cursor: mode === "login" ? "default" : "pointer",
              fontWeight: 700,
              boxShadow:
                mode === "login" ? "0 8px 18px rgba(46,125,50,0.22)" : "none",
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            disabled={mode === "register" || loading}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 10,
              border: "none",
              background: mode === "register" ? "#2E7D32" : "transparent",
              color: mode === "register" ? "#fff" : "#1b4332",
              cursor: mode === "register" ? "default" : "pointer",
              fontWeight: 700,
              boxShadow:
                mode === "register"
                  ? "0 8px 18px rgba(46,125,50,0.22)"
                  : "none",
            }}
          >
            Register
          </button>
        </div>

        <input
          style={{
            ...inputStyle,
            border: emailError ? "1px solid #c62828" : inputStyle.border,
          }}
          type="email"
          autoComplete="off"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage("");
            setMessageType("");
            setEmailError("");
          }}
        />
        {emailError && <div style={errorTextStyle}>{emailError}</div>}

        <input
          style={{
            ...inputStyle,
            border: passwordError ? "1px solid #c62828" : inputStyle.border,
          }}
          type="password"
          autoComplete="off"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setMessage("");
            setMessageType("");
            setPasswordError("");
          }}
        />
        {passwordError && <div style={errorTextStyle}>{passwordError}</div>}

        {mode === "register" && (
          <>
            <input
              style={{
                ...inputStyle,
                border: confirmPasswordError
                  ? "1px solid #c62828"
                  : inputStyle.border,
              }}
              type="password"
              autoComplete="off"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setMessage("");
                setMessageType("");
                setConfirmPasswordError("");
              }}
            />
            {confirmPasswordError && (
              <div style={errorTextStyle}>{confirmPasswordError}</div>
            )}
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: "#1b4332",
              fontWeight: 600,
            }}
          >
            Account type
          </label>

          <select
            value={orgType}
            onChange={(e) => {
              setOrgType(e.target.value);
              setMessage("");
              setMessageType("");
              setOrgTypeError("");
            }}
            disabled={loading}
            style={{
              width: "100%",
              display: "block",
              boxSizing: "border-box",
              padding: 13,
              borderRadius: 12,
              border: orgTypeError ? "1px solid #c62828" : "1px solid #d7e3d9",
              background: "#fff",
              color: "#111",
              fontSize: 15,
            }}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="principal">Principal</option>
            <option value="admin">Admin</option>
            <option value="chairman">Chairman</option>
            <option value="public">Public visitors and users</option>
            <option value="community">Other communities</option>
          </select>
          {orgTypeError && <div style={errorTextStyle}>{orgTypeError}</div>}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            color: "#355e3b",
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => {
              const checked = e.target.checked;
              setRememberMe(checked);

              if (!checked) {
                localStorage.removeItem(rememberedEmailKey);
              }
            }}
          />
          Remember email
        </label>

        {mode === "register" ? (
          <button
            type="button"
            onClick={register}
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              background: "linear-gradient(135deg, #2E7D32, #43A047)",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: "0 10px 24px rgba(46,125,50,0.24)",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              background: "linear-gradient(135deg, #2E7D32, #43A047)",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: "0 10px 24px rgba(46,125,50,0.24)",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        )}
      </div>
    </div>
  );
}

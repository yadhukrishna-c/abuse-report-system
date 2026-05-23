import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../pages/service/apiservice";

const getTokenFromResponse = (payload) =>
  payload?.token ||
  payload?.accessToken ||
  payload?.jwt ||
  payload?.data?.token ||
  payload?.data?.accessToken ||
  payload?.data?.jwt ||
  payload?.data?.data?.token ||
  payload?.data?.data?.accessToken ||
  payload?.data?.data?.jwt ||
  payload?.user?.token ||
  payload?.user?.accessToken ||
  "";

const getUserFromResponse = (payload) =>
  payload?.user ||
  payload?.data?.user ||
  payload?.data?.data?.user ||
  null;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /* ================= LOGIN ================= */
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Please fill in all fields");
    return;
  }

  try {
    const data = await loginUser(email, password);
    const token = getTokenFromResponse(data);
    const user = getUserFromResponse(data);

    // Store JWT token
    if (token) {
      localStorage.setItem("token", token);
    }

    // Store user data
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    const userRole = user?.role || data?.role || data?.data?.role || data?.data?.data?.role;

    if (!token) {
      setError("Login succeeded but token is missing in response");
      return;
    }

    // Navigate based on role
    if (userRole === "admin") {
      navigate("/admin-dashboard");
    } else if (userRole === "doctor") {
      navigate("/doctor-dashboard");
    } else if (userRole === "counsellor") {   // ✅ Added counsellor check
      navigate("/counsellor-dashboard");
    } else if (userRole === "user") {
      navigate("/user-dashboard");
    } else {
      navigate("/");
    }

  } catch (err) {
    setError(err.response?.data?.message || "Invalid email or password");
  }
};

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleLoginSubmit}>
        <h2 style={styles.title}>Login</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button type="submit" style={styles.button}>
          Login
        </button>

        <p style={styles.register}>
          New user?{" "}
          <Link to="/registration" style={styles.registerLink}>
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #74ABE2, #5563DE)",
    padding: "20px",
  },
  form: {
    background: "#fff",
    padding: "40px 30px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    marginBottom: "25px",
    fontSize: "28px",
    color: "#333",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "12px",
    marginTop: "15px",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(90deg, #5563DE, #74ABE2)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginBottom: "10px",
  },
  register: {
    marginTop: "15px",
    fontSize: "14px",
  },
  registerLink: {
    color: "#5563DE",
    fontWeight: "600",
    textDecoration: "none",
  },
};

export default Login;

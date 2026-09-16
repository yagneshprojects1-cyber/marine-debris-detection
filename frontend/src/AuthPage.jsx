import { useMemo, useState } from "react";
import { API_BASE_URL } from "./config/api";
import "./AuthPage.css";

const ROLE_OPTIONS = [
  "Supervisor / Manager",
  "System Administrator",
  "Sonar Analyst",
  "Marine Debris Removal Operator",
];

const getStoredToken = () => localStorage.getItem("marine_debris_token");

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Sonar Analyst");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pageTitle = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your account"),
    [mode]
  );

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...(mode === "signup" ? { role } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      localStorage.setItem("marine_debris_token", data.token);
      localStorage.setItem("marine_debris_user", JSON.stringify({
        username: data.username,
        role: data.role,
        account_created_at: data.account_created_at,
      }));

      onAuthenticated({
        username: data.username,
        role: data.role,
        account_created_at: data.account_created_at,
        token: data.token,
      });
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const existingToken = getStoredToken();
  if (existingToken && onAuthenticated) {
    const storedUser = localStorage.getItem("marine_debris_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      onAuthenticated({
        username: parsedUser.username,
        role: parsedUser.role,
        account_created_at: parsedUser.account_created_at,
        token: existingToken,
      });
      return null;
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="auth-eyebrow">Marine Debris Detection System</p>
        <h1>{pageTitle}</h1>
        <p className="auth-subtitle">
          Sign in to access the role-based workspace or create a new operator account.
        </p>

        <form className="auth-form" onSubmit={submitAuth}>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <>
              Don’t have an account? <button type="button" onClick={() => setMode("signup")}>Sign up</button>
            </>
          ) : (
            <>
              Already registered? <button type="button" onClick={() => setMode("login")}>Login</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

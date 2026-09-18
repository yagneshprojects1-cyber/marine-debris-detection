import { useState } from "react";
import { API_BASE_URL } from "./config/api";
import "./AuthPage.css";

const getStoredToken = () => localStorage.getItem("marine_debris_token");

export default function AuthPage({ onAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
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
        <h1>Welcome back</h1>
        <p className="auth-subtitle">
          Login to access your role-based marine debris workspace.
        </p>

        <form className="auth-form" onSubmit={submitAuth}>
          <div className="auth-field">
            <label htmlFor="username">Username or email</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username or email"
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
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.2 10 7-0.4 1-1.2 2.2-2.3 3.3" />
                      <path d="M6.2 6.2C3.9 7.7 2.5 10 2 12c1.2 2.8 4.8 7 10 7 1.2 0 2.3-.2 3.3-.6" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </section>

      <section className="auth-visual" aria-label="Ocean sonar monitoring">
        <img
          className="auth-visual-image"
          src={`${process.env.PUBLIC_URL}/ocean-sonar-device.png`}
          alt="Sonar submarine detecting marine debris on the ocean floor"
        />
      </section>
    </main>
  );
}

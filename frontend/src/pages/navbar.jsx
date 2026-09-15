import "./navbar.css";

const Navbar = ({
  activeTab,
  onNavigate,
  role,
  onLogout,
}) => {
  return (
    <nav className="main-navbar" aria-label="Main navigation">
      <span className="navbar-role" aria-label={`Signed in as ${role}`}>
        {role}
      </span>

      {role !== "Sonar Analyst" && role !== "System Administrator" && (
        <span className="navbar-role-label">Role workspace</span>
      )}

      {role === "Sonar Analyst" && <>
      <button
        type="button"
        onClick={() => onNavigate("dashboard")}
        aria-current={activeTab === "dashboard" ? "page" : undefined}
        className={`navbar-tab${activeTab === "dashboard" ? " active" : ""}`}
      >
        Dashboard
      </button>

      <button
        type="button"
        onClick={() => onNavigate("history")}
        aria-current={activeTab === "history" ? "page" : undefined}
        className={`navbar-tab${activeTab === "history" ? " active" : ""}`}
      >
        History
      </button>

      <button
        type="button"
        onClick={() => onNavigate("route-optimization")}
        aria-current={activeTab === "route-optimization" ? "page" : undefined}
        className={`navbar-tab${activeTab === "route-optimization" ? " active" : ""}`}
      >
        Route Optimization
      </button>
      </>}

      {role === "System Administrator" && <>
      <button
        type="button"
        onClick={() => onNavigate("dashboard")}
        aria-current={activeTab === "dashboard" ? "page" : undefined}
        className={`navbar-tab${activeTab === "dashboard" ? " active" : ""}`}
      >
        Dashboard
      </button>

      <button
        type="button"
        onClick={() => onNavigate("users")}
        aria-current={activeTab === "users" ? "page" : undefined}
        className={`navbar-tab${activeTab === "users" ? " active" : ""}`}
      >
        Users
      </button>

      <button
        type="button"
        onClick={() => onNavigate("ai-config")}
        aria-current={activeTab === "ai-config" ? "page" : undefined}
        className={`navbar-tab${activeTab === "ai-config" ? " active" : ""}`}
      >
        AI Config
      </button>

      <button
        type="button"
        onClick={() => onNavigate("system-config")}
        aria-current={activeTab === "system-config" ? "page" : undefined}
        className={`navbar-tab${activeTab === "system-config" ? " active" : ""}`}
      >
        System Settings
      </button>

      <button
        type="button"
        onClick={() => onNavigate("health-logs")}
        aria-current={activeTab === "health-logs" ? "page" : undefined}
        className={`navbar-tab${activeTab === "health-logs" ? " active" : ""}`}
      >
        Health & Logs
      </button>
      </>}

      <button type="button" className="navbar-action" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
};

export default Navbar;

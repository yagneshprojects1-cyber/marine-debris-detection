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

      {role !== "Sonar Analyst" && (
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

      <button type="button" className="navbar-action" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
};

export default Navbar;

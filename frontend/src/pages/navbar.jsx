import "./navbar.css";

const Navbar = ({
  activeTab,
  onNavigate,
  role,
  onLogout,
}) => {
  const isManager = role === "Supervisor / Manager";
  const isAnalyst = role === "Sonar Analyst";
  const isOperator = role === "Marine Debris Removal Operator";
  const isSystemAdmin = role === "System Administrator";

  return (
    <nav className="main-navbar" aria-label="Main navigation">
      {!isAnalyst && !isManager && !isOperator && !isSystemAdmin && (
        <span className="navbar-role-label">Role workspace</span>
      )}

      {isAnalyst && (
        <>
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
        </>
      )}

      {isManager && (
        <>
          <button
            type="button"
            onClick={() => onNavigate("waiting-approval")}
            aria-current={activeTab === "waiting-approval" || activeTab === "dashboard" ? "page" : undefined}
            className={`navbar-tab${activeTab === "waiting-approval" || activeTab === "dashboard" ? " active" : ""}`}
          >
            Waiting for approval
          </button>

          <button
            type="button"
            onClick={() => onNavigate("allocate-removal")}
            aria-current={activeTab === "allocate-removal" ? "page" : undefined}
            className={`navbar-tab${activeTab === "allocate-removal" ? " active" : ""}`}
          >
            Allocate to removal
          </button>

          <button
            type="button"
            onClick={() => onNavigate("manager-history")}
            aria-current={activeTab === "manager-history" ? "page" : undefined}
            className={`navbar-tab${activeTab === "manager-history" ? " active" : ""}`}
          >
            History
          </button>
        </>
      )}

      {isOperator && (
        <>
          <button
            type="button"
            onClick={() => onNavigate("my-tasks")}
            aria-current={activeTab === "my-tasks" ? "page" : undefined}
            className={`navbar-tab${activeTab === "my-tasks" ? " active" : ""}`}
          >
            My Assigned Tasks
          </button>
          <button
            type="button"
            onClick={() => onNavigate("operator-history")}
            aria-current={activeTab === "operator-history" ? "page" : undefined}
            className={`navbar-tab${activeTab === "operator-history" ? " active" : ""}`}
          >
            History
          </button>
        </>
      )}

      {isSystemAdmin && (
        <>
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
        </>
      )}

      <div className="navbar-user-actions">
        <span className="navbar-role" aria-label={`Signed in as ${role}`}>
          {role}
        </span>

        <button
          type="button"
          className="navbar-action"
          onClick={onLogout}
          aria-label="Logout"
          title="Logout"
        >
          <svg className="navbar-logout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
            <path d="M14 8l4 4-4 4" />
            <path d="M18 12H8" />
          </svg>
        </button>
      </div>
    </nav>
  ); 
};

export default Navbar;

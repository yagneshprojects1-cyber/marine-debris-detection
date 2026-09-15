import "./navbar.css";

const Navbar = ({
  activeTab,
  onNavigate,
}) => {
  return (
    <nav className="main-navbar" aria-label="Main navigation">
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
    </nav>
  );
};

export default Navbar;

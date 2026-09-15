import "./navbar.css";

const Navbar = ({
  activeTab,
  onNavigate,
  hasDetections,
  onGenerateReport,
}) => {
  const renderLockedAction = (button, className = "") => {
    if (!hasDetections) {
      return (
        <span className={`navbar-tab-tooltip ${className}`} data-tooltip="Please upload and analyze data">
          {button}
        </span>
      );
    }

    return button;
  };

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

      <>
        {renderLockedAction(
          <button
            type="button"
            onClick={() => onNavigate("maps")}
            aria-current={activeTab === "maps" ? "page" : undefined}
            className={`navbar-tab${activeTab === "maps" ? " active" : ""}`}
            disabled={!hasDetections}
          >
            Show Object on Map
          </button>
        )}

        {renderLockedAction(
          <button
            type="button"
            onClick={() => onNavigate("3d-map")}
            aria-current={activeTab === "3d-map" ? "page" : undefined}
            className={`navbar-tab${activeTab === "3d-map" ? " active" : ""}`}
            disabled={!hasDetections}
          >
            Show in 3D Map
          </button>
        )}

        {renderLockedAction(
          <button
            type="button"
            className={`navbar-tab${activeTab === "report" ? " active" : ""}`}
            style={{ marginLeft: "auto" }}
            onClick={onGenerateReport}
            disabled={!hasDetections}
          >
            Generate Report
          </button>,
          "navbar-report-tooltip"
        )}
      </>
    </nav>
  );
};

export default Navbar;

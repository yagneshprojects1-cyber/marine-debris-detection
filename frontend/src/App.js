import { useEffect, useState } from "react";
import './App.css';
import Navbar from './pages/navbar';
import PageContent from './pages/PageContent';
import RoleSelectionPage from './roles/RoleSelectionPage';
import RoleLandingPage from './roles/RoleLandingPage';
import ManagerDashboard from './roles/manager/ManagerDashboard';
import OperatorDashboard from './roles/operator/OperatorDashboard';
import { API_BASE_URL, AI_API_BASE_URL } from './config/api';

function App() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [databaseDetections, setDatabaseDetections] = useState([]);
  const [detectionResult, setDetectionResult] = useState(null);
  const [showAnalysisToast, setShowAnalysisToast] = useState(false);

  const loadMapData = () => {
    return fetch(`${API_BASE_URL}/api/map-data`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to load map data.");
        setDatabaseDetections(Array.isArray(data.detections) ? data.detections : []);
      })
      .catch((error) => {
        console.error("Map data loading failed:", error);
        setDatabaseDetections([]);
      });
  };

  useEffect(() => {
    loadMapData();
  }, []);

  const handleDetectionComplete = (result) => {
    setDetectionResult(result);
    loadMapData();
    setShowAnalysisToast(Boolean(result));
  };

  useEffect(() => {
    if (!showAnalysisToast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setShowAnalysisToast(false);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [showAnalysisToast]);

  const handleGenerateReport = (selectedObject = null) => {
    if (!detectionResult) return;

    const payload = selectedObject
      ? {
          image_id: detectionResult.image_id || "selected-object",
          object: {
            ...selectedObject,
            source: selectedObject.source || "selected-object",
          },
          generated_at: new Date().toISOString(),
        }
      : detectionResult;

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = selectedObject
      ? `${(selectedObject.name || "selected-object").replace(/\s+/g, "-").toLowerCase()}.json`
      : `${detectionResult.image_id || "detection-report"}.json`;

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === "Marine Debris Removal Operator") {
      setActiveTab("my-tasks");
    } else {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    setSelectedRole(null);
    setDetectionResult(null);
    setActiveTab("dashboard");
  };

  if (!selectedRole) {
    return <RoleSelectionPage onRoleSelect={handleRoleSelect} />;
  }

  const isSonarAnalyst = selectedRole === "Sonar Analyst";
  const isManager = selectedRole === "Supervisor / Manager";
  const isOperator = selectedRole === "Marine Debris Removal Operator";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Navbar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        role={selectedRole}
        onLogout={handleLogout}
      />
      {/* Scrollable page area: every tab can grow and scroll here */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isSonarAnalyst ? (
          <PageContent
            activeTab={activeTab}
            aiApiBaseUrl={AI_API_BASE_URL}
            apiBaseUrl={API_BASE_URL}
            detections={databaseDetections}
            detectionResult={detectionResult}
            onDetectionComplete={handleDetectionComplete}
            onNavigate={setActiveTab}
            onGenerateReport={handleGenerateReport}
          />
        ) : isManager ? (
          <ManagerDashboard
            activeTab={activeTab}
          />
        ) : isOperator ? (
          <OperatorDashboard
            activeTab={activeTab}
          />
        ) : (
          <RoleLandingPage role={selectedRole} />
        )}
      </div>
      {showAnalysisToast && (
        <div className="analysis-toast" role="status" aria-live="polite">
          Analysis generated
        </div>
      )}
    </div>
  );
}

export default App;

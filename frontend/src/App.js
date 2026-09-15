import { useEffect, useState } from "react";
import './App.css';
import Navbar from './pages/navbar';
import PageContent from './pages/PageContent';
import { API_BASE_URL, AI_API_BASE_URL } from './config/api';
import { downloadReport } from './utils/downloadReport';

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [detections, setDetections] = useState([]);
  const [databaseDetections, setDatabaseDetections] = useState([]);
  const [detectionResult, setDetectionResult] = useState(null);
  const [selectedMapDetections, setSelectedMapDetections] = useState([]);
  const [showAnalysisToast, setShowAnalysisToast] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);

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
    setDetections(result?.objects_detected || []);
    setSelectedMapDetections([]);
    loadMapData();
    setShowAnalysisToast(Boolean(result));
    if (result) setLastDetectionTime(Date.now());
  };

  const handleShowHistoryDetection = (item, targetTab) => {
    const detection = {
      ...item,
      name: item.object,
      confidence: Number(item.confidence),
      latitude: item.latitude,
      longitude: item.longitude,
    };

    setSelectedMapDetections([detection]);
    setDetectionResult((current) => ({
      ...current,
      ship_latitude: item.latitude,
      ship_longitude: item.longitude,
    }));
    setActiveTab(targetTab);
  };

  useEffect(() => {
    if (!showAnalysisToast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setShowAnalysisToast(false);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [showAnalysisToast]);

  const handleGenerateReport = () => {
    downloadReport(AI_API_BASE_URL, detectionResult?.image_id);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Navbar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        hasDetections={detections.length > 0}
        onGenerateReport={handleGenerateReport}
      />
      {/* Scrollable page area: every tab can grow and scroll here */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <PageContent
          activeTab={activeTab}
          aiApiBaseUrl={AI_API_BASE_URL}
          apiBaseUrl={API_BASE_URL}
          detections={databaseDetections}
          selectedMapDetections={selectedMapDetections}
          detectionResult={detectionResult}
          onDetectionComplete={handleDetectionComplete}
          onShowHistoryDetection={handleShowHistoryDetection}
          onNavigate={setActiveTab}
          lastDetectionTime={lastDetectionTime}
        />
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

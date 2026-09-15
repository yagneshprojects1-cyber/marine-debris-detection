import SonarAnalystDashboard from "./SonarAnalystDashboard";
import MapPage from "./MapPage";
import ThreeDMapPage from "./ThreeDMapPage";
import AnnotatedImagePage from "./AnnotatedImagePage";
import HistoryPage from "./HistoryPage";
import RouteOptimizationPage from "./RouteOptimizationPage";

export default function PageContent({
  activeTab,
  aiApiBaseUrl,
  apiBaseUrl,
  detections,
  detectionResult,
  onDetectionComplete,
  onNavigate,
  onGenerateReport,
}) {
  return (
    <>
      <div
        style={{
          display: activeTab === "dashboard" ? "block" : "none",
          height: "100%",
        }}
      >
        <SonarAnalystDashboard
          aiApiBaseUrl={aiApiBaseUrl}
          onDetectionComplete={onDetectionComplete}
          onNavigate={onNavigate}
        />
      </div>

      {activeTab === "maps" && (
        <MapPage
          apiBaseUrl={apiBaseUrl}
          detectionPoints={detections}
          detectionResult={detectionResult}
          onGenerateReport={onGenerateReport}
        />
      )}
      {activeTab === "3d-map" && (
        <ThreeDMapPage
          detections={detections}
          shipLatitude={detectionResult?.ship_latitude}
          shipLongitude={detectionResult?.ship_longitude}
          onNavigate={onNavigate}
          onGenerateReport={onGenerateReport}
        />
      )}
      {activeTab === "annotated-image" && (
        <AnnotatedImagePage
          apiBaseUrl={aiApiBaseUrl}
          imageUrl={detectionResult?.annotated_image_url}
        />
      )}
      {activeTab === "history" && <HistoryPage apiBaseUrl={apiBaseUrl} />}
      {activeTab === "route-optimization" && (
        <RouteOptimizationPage apiBaseUrl={apiBaseUrl} />
      )}
    </>
  );
}
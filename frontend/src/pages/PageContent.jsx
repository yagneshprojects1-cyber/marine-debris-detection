import Dashboard from "./dashboard";
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
  selectedMapDetections = [],
  detectionResult,
  onDetectionComplete,
  onShowHistoryDetection,
  onNavigate,
  lastDetectionTime,
}) {
  const mapDetections = selectedMapDetections.length > 0 ? selectedMapDetections : detections;

  return (
    <>
      <div
        style={{
          display: activeTab === "dashboard" ? "block" : "none",
          height: "100%",
        }}
      >
        <Dashboard
          aiApiBaseUrl={aiApiBaseUrl}
          onDetectionComplete={onDetectionComplete}
          onNavigate={onNavigate}
        />
      </div>

      {activeTab === "maps" && (
        <MapPage apiBaseUrl={apiBaseUrl} detectionPoints={mapDetections} />
      )}
      {activeTab === "3d-map" && (
        <ThreeDMapPage
          detections={mapDetections}
          shipLatitude={detectionResult?.ship_latitude}
          shipLongitude={detectionResult?.ship_longitude}
          onNavigate={onNavigate}
        />
      )}
      {activeTab === "annotated-image" && (
        <AnnotatedImagePage
          apiBaseUrl={aiApiBaseUrl}
          imageUrl={detectionResult?.annotated_image_url}
        />
      )}
      {activeTab === "history" && (
        <HistoryPage
          apiBaseUrl={apiBaseUrl}
          lastDetectionTime={lastDetectionTime}
          onShowHistoryDetection={onShowHistoryDetection}
        />
      )}
      {activeTab === "route-optimization" && (
        <RouteOptimizationPage apiBaseUrl={apiBaseUrl} />
      )}
    </>
  );
}

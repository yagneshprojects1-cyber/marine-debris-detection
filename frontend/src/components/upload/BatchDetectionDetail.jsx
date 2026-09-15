import DetectionResults from "./DetectionResults";
import MapPage from "../../pages/MapPage";
import ThreeDMapPage from "../../pages/ThreeDMapPage";
import { downloadReport } from "../../utils/downloadReport";

export default function BatchDetectionDetail({
  item,
  activeView,
  onViewChange,
  onBack,
  apiBaseUrl,
}) {
  const result = item?.result;
  if (!item || !result) return null;

  const detections = result.objects_detected || [];
  const tabs = [
    { id: "results", label: "Detection Results" },
    { id: "2d", label: "2D Map" },
    { id: "3d", label: "3D Map" },
  ];

  return (
    <section className="batch-detail-page" aria-label={`Batch details for ${item.filename}`}>
      <div className="batch-detail-header">
        <div>
          <span className="batch-detail-eyebrow">Selected batch record</span>
          <h2>{item.filename}</h2>
          <p>{detections.length} object{detections.length !== 1 ? "s" : ""} detected</p>
        </div>
        <button type="button" className="batch-detail-back" onClick={onBack}>
          <span aria-hidden="true">←</span>
          <span>Back to batch</span>
        </button>
      </div>

      <div className="batch-detail-toolbar">
        <div className="batch-detail-tabs" role="tablist" aria-label="Batch record views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeView === tab.id}
              className={activeView === tab.id ? "active" : ""}
              onClick={() => onViewChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {result?.image_id && (
          <button
            type="button"
            className="batch-detail-download"
            onClick={() => downloadReport(apiBaseUrl, result.image_id)}
          >
            Download Report
          </button>
        )}
      </div>

      <div className="batch-detail-content">
        {activeView === "results" && <DetectionResults detectionResult={result} />}
        {activeView === "2d" && (
          <div className="batch-detail-map">
            <MapPage apiBaseUrl={apiBaseUrl} detectionPoints={detections} />
          </div>
        )}
        {activeView === "3d" && (
          <div className="batch-detail-map">
            <ThreeDMapPage
              detections={detections}
              shipLatitude={result.ship_latitude}
              shipLongitude={result.ship_longitude}
            />
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import DetectionResults from "./DetectionResults";
import MapPage from "../../pages/MapPage";
import ThreeDMapPage from "../../pages/ThreeDMapPage";
import { downloadReport } from "../../utils/downloadReport";

const REVIEW_THRESHOLD = 0.7;

export default function BatchDetectionDetail({
  item,
  activeView,
  onViewChange,
  onBack,
  apiBaseUrl,
  onAccept,
  accepted,
  backLabel = "Back to batch",
  showHeader = true,
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [analystNames, setAnalystNames] = useState({});
  const [saving, setSaving] = useState(false);
  const result = item?.result;
  if (!item || !result) return null;

  const detections = result.objects_detected || [];
  const lowConfidenceIndexes = detections
    .map((detection, index) => (Number(detection.confidence) < REVIEW_THRESHOLD ? index : -1))
    .filter((index) => index >= 0);
  const tabs = [
    { id: "results", label: "Detection Results" },
    { id: "2d", label: "2D Map" },
    { id: "3d", label: "3D Map" },
  ];

  const handleSaveClick = async () => {
    if (lowConfidenceIndexes.length > 0) {
      setReviewOpen(true);
      return;
    }

    setSaving(true);
    try {
      await onAccept?.(item, detections.map((detection, index) => ({
        detection_index: index,
        analyst_name: detection.name,
      })));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="batch-detail-page" aria-label={`Batch details for ${item.filename}`}>
      {showHeader && (
        <div className="batch-detail-header">
          <div>
            <span className="batch-detail-eyebrow">Selected batch record</span>
            <h2>{item.filename}</h2>
            <p>{detections.length} object{detections.length !== 1 ? "s" : ""} detected</p>
          </div>
          <button type="button" className="batch-detail-back" onClick={onBack}>
            <span aria-hidden="true">←</span>
            <span>{backLabel}</span>
          </button>
        </div>
      )}

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
          <div className="batch-detail-actions">
            <button
              type="button"
              className="batch-detail-accept"
              onClick={handleSaveClick}
              disabled={accepted || saving}
            >
              {accepted ? "Saved in database" : saving ? "Saving..." : "Save in database"}
            </button>
            <button
              type="button"
              className="batch-detail-download"
              onClick={() => downloadReport(apiBaseUrl, result.image_id)}
            >
              Download Report
            </button>
          </div>
        )}
      </div>

      <div className="batch-detail-content">
        {activeView === "results" && (
          <>
            {result.annotated_image_url && (
              <div className="batch-detail-image-panel">
                <span className="batch-detail-eyebrow">AI annotated output</span>
                <img
                  src={`${apiBaseUrl}${result.annotated_image_url}`}
                  alt={`AI detected objects in ${item.filename}`}
                  className="batch-detail-image"
                />
              </div>
            )}
            <DetectionResults detectionResult={result} />
          </>
        )}
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

      {reviewOpen && (
        <div className="training-review-backdrop" role="presentation">
          <section className="training-review-modal" role="dialog" aria-modal="true" aria-labelledby="training-review-title">
            <div className="training-review-header">
              <div>
                <span className="batch-detail-eyebrow">Analyst review</span>
                <h2 id="training-review-title">Review AI detection</h2>
              </div>
              <button type="button" className="training-review-close" onClick={() => setReviewOpen(false)} disabled={saving}>
                Close
              </button>
            </div>

            <img
              className={`training-review-image${lowConfidenceIndexes.length ? " low-confidence" : ""}`}
              src={`${apiBaseUrl}${result.annotated_image_url}`}
              alt={`AI annotated output for ${item.filename}`}
            />
            <p className="training-review-threshold">
              Review threshold: <strong>{REVIEW_THRESHOLD * 100}%</strong>. Low-confidence results need an analyst label before saving.
            </p>

            <div className="training-review-results">
              {detections.map((detection, index) => {
                const confidence = Number(detection.confidence);
                const lowConfidence = Number.isFinite(confidence) && confidence < REVIEW_THRESHOLD;
                return (
                  <div className={`training-review-result${lowConfidence ? " low-confidence" : ""}`} key={`${detection.name}-${index}`}>
                    <div>
                      <strong>{detection.name}</strong>
                      <span>{Number.isFinite(confidence) ? `${(confidence * 100).toFixed(1)}% confidence` : "No confidence score"}</span>
                    </div>
                    {lowConfidence ? (
                      <label>
                        Correct object name
                        <input
                          value={analystNames[index] || ""}
                          onChange={(event) => setAnalystNames((current) => ({ ...current, [index]: event.target.value }))}
                          placeholder="Enter verified object name"
                        />
                      </label>
                    ) : (
                      <p className="training-review-good">The AI prediction appears correct because its confidence is above the review threshold.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {lowConfidenceIndexes.length > 0 && (
              <p className="training-review-warning">
                We are asking for the object name because at least one prediction has low confidence. Your verified label will be stored as AI training data to improve future models.
              </p>
            )}

            <div className="training-review-actions">
              <button type="button" className="training-review-cancel" onClick={() => setReviewOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="batch-detail-accept"
                disabled={saving || lowConfidenceIndexes.some((index) => !analystNames[index]?.trim())}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onAccept?.(item, detections.map((detection, index) => ({
                      detection_index: index,
                      analyst_name: analystNames[index]?.trim() || detection.name,
                    })));
                    setReviewOpen(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving..." : "Save in database"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

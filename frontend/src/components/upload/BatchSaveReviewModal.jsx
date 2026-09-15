import { useState } from "react";

const REVIEW_THRESHOLD = 0.7;

export default function BatchSaveReviewModal({ items, onClose, onSave, apiBaseUrl, saving }) {
  const [labels, setLabels] = useState({});
  const [selectedObject, setSelectedObject] = useState(null);
  const completedItems = items.filter((item) => item.phase === "done" && item.result);
  const lowConfidenceItems = completedItems.flatMap((item) => (
    (item.result.objects_detected || [])
      .map((detection, detectionIndex) => ({ item, detection, detectionIndex }))
      .filter(({ detection }) => Number(detection.confidence) < REVIEW_THRESHOLD)
  ));

  const missingLabels = lowConfidenceItems.some(({ item, detectionIndex }) => (
    !labels[`${item.result.image_id}:${detectionIndex}`]?.trim()
  ));

  const handleSave = () => {
    const records = completedItems.map((item) => ({
      image_id: item.result.image_id,
      annotated_image_url: item.result.annotated_image_url,
      labels: (item.result.objects_detected || []).map((detection, detectionIndex) => ({
        detection_index: detectionIndex,
        analyst_name: labels[`${item.result.image_id}:${detectionIndex}`]?.trim() || detection.name,
      })),
    }));
    onSave(records);
  };

  return (
    <div className="training-review-backdrop" role="presentation">
      <section className="training-review-modal batch-save-modal" role="dialog" aria-modal="true" aria-labelledby="batch-save-title">
        <div className="training-review-header">
          <div>
            <span className="batch-detail-eyebrow">Batch review</span>
            <h2 id="batch-save-title">Save all detection results</h2>
          </div>
          <button type="button" className="training-review-close" onClick={onClose} disabled={saving}>Close</button>
        </div>

        <p className="training-review-threshold">
          Results at or above <strong>{REVIEW_THRESHOLD * 100}%</strong> can be saved automatically.
          Low-confidence results need an analyst name before this batch is saved.
        </p>

        <div className="batch-save-result-list">
          {completedItems.map((item) => (
            <div className="batch-save-result" key={item.result.image_id}>
              <strong>{item.filename}</strong>
              {(item.result.objects_detected || []).map((detection, detectionIndex) => {
                const confidence = Number(detection.confidence);
                const lowConfidence = confidence < REVIEW_THRESHOLD;
                const fieldKey = `${item.result.image_id}:${detectionIndex}`;
                return (
                  <div className={`batch-save-object${lowConfidence ? " low-confidence" : ""}`} key={`${fieldKey}-${detection.name}`}>
                    <span>{detection.name} - {(confidence * 100).toFixed(1)}%</span>
                    {lowConfidence ? (
                      <div className="batch-save-input-actions">
                        <input
                          value={labels[fieldKey] || ""}
                          onChange={(event) => setLabels((current) => ({ ...current, [fieldKey]: event.target.value }))}
                          placeholder="Enter correct object name"
                          aria-label={`Correct object name for ${item.filename}`}
                        />
                        <button
                          type="button"
                          className="batch-save-details-button"
                          onClick={() => setSelectedObject({ item, detection })}
                        >
                          View details
                        </button>
                      </div>
                    ) : (
                      <em>AI prediction accepted</em>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {selectedObject && (
          <div className="training-object-detail-backdrop" role="presentation">
            <section className="training-object-detail-modal" role="dialog" aria-modal="true" aria-labelledby="object-detail-title">
              <div className="training-review-header">
                <div>
                  <span className="batch-detail-eyebrow">AI object details</span>
                  <h2 id="object-detail-title">{selectedObject.detection.name}</h2>
                </div>
                <button
                  type="button"
                  className="training-review-close"
                  onClick={() => setSelectedObject(null)}
                >
                  Close
                </button>
              </div>
              {selectedObject.item.result.annotated_image_url && (
                <img
                  className="training-object-detail-image"
                  src={`${apiBaseUrl}${selectedObject.item.result.annotated_image_url}`}
                  alt={`AI detected ${selectedObject.detection.name}`}
                />
              )}
              <div className="training-object-detail-score">
                <span>Detected name</span>
                <strong>{selectedObject.detection.name}</strong>
                <span>Confidence score</span>
                <strong>{(Number(selectedObject.detection.confidence) * 100).toFixed(1)}%</strong>
              </div>
            </section>
          </div>
        )}

        {lowConfidenceItems.length > 0 && (
          <p className="training-review-warning">
            Corrected low-confidence names are stored as AI training data. They are not added to normal detection history.
          </p>
        )}

        <div className="training-review-actions">
          <button type="button" className="training-review-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="batch-detail-accept" onClick={handleSave} disabled={saving || missingLabels}>
            {saving ? "Saving..." : "Save all in database"}
          </button>
        </div>
      </section>
    </div>
  );
}

import React, { useState } from "react";

export default function SurveyDetailModal({ survey, onClose, onUpdateDetection }) {
  const [selectedDetection, setSelectedDetection] = useState(
    survey?.detections?.[0] || null
  );
  const [priority, setPriority] = useState(selectedDetection?.priority || "Normal");
  const [notes, setNotes] = useState(selectedDetection?.operational_notes || "");
  const [approvedDetectionIds, setApprovedDetectionIds] = useState(
    new Set((survey?.detections || []).filter((detection) => detection.status === "Approved").map((detection) => detection.id)),
  );
  const [saving, setSaving] = useState(false);

  if (!survey) return null;

  const handleSaveDecision = async () => {
    if (!selectedDetection || selectedDetection.status !== "Validated") return;
    setSaving(true);
    try {
      await onUpdateDetection({
        detection_id: selectedDetection.id,
        priority,
        status: "Approved",
        operational_notes: notes,
      });
      setSelectedDetection((prev) => ({
        ...prev,
        priority,
        status: "Approved",
        operational_notes: notes,
      }));
      const nextApprovedIds = new Set([...approvedDetectionIds, selectedDetection.id]);
      setApprovedDetectionIds(nextApprovedIds);
      const nextDetection = survey.detections?.find(
        (detection) => detection.id !== selectedDetection.id
          && detection.status === "Validated"
          && !nextApprovedIds.has(detection.id),
      );
      if (nextDetection) {
        setSelectedDetection(nextDetection);
        setPriority(nextDetection.priority || "Normal");
        setNotes(nextDetection.operational_notes || "");
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Failed to update detection:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manager-modal-backdrop" onClick={onClose}>
      <div className="manager-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="survey-id-badge">{survey.survey_id}</span>
            <h2 className="modal-title">{survey.title}</h2>
            <p className="modal-subtitle">
              Conducted by {survey.analyst_name} &bull; {survey.location}
            </p>
          </div>

          <div className="modal-nav-actions">
            <button type="button" className="btn-close-modal" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="modal-body-layout">
            {/* Right panel: Inspection & Operational decision controls */}
            <div className="modal-detection-detail">
              {selectedDetection ? (
                <>
                  {survey.detections?.length > 1 && (
                    <div className="detection-switcher" role="tablist" aria-label="Detected objects">
                      {survey.detections.map((detection) => (
                        <button
                          key={detection.id}
                          type="button"
                          role="tab"
                          aria-selected={selectedDetection.id === detection.id}
                          className={selectedDetection.id === detection.id ? "active" : ""}
                          onClick={() => {
                            setSelectedDetection(detection);
                            setPriority(detection.priority || "Normal");
                            setNotes(detection.operational_notes || "");
                          }}
                        >
                          {detection.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="detail-section-header">
                    <h3>Anomaly Review: {selectedDetection.name}</h3>
                    <span className="det-id-label">ID: {selectedDetection.id}</span>
                  </div>

                  {/* Object confidence and position information */}
                  <div className="object-spec-grid">
                    <div className="spec-card">
                      <span className="spec-label">Coordinates</span>
                      <span className="spec-val">
                        {selectedDetection.latitude?.toFixed(4)}, {selectedDetection.longitude?.toFixed(4)}
                      </span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">Seabed Depth</span>
                      <span className="spec-val">{selectedDetection.depth} meters</span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">Confidence Score</span>
                      <span className="spec-val">{((selectedDetection.confidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Manager Operational Decision Form */}
                  <div className="operational-decision-form">
                    <h4>Manager Operational Decision</h4>

                    <div className="form-group-row">
                      <div className="form-field">
                        <label>Set Priority Level</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                          <option value="High Priority">⚠️ High Priority</option>
                          <option value="Medium Priority">🔶 Medium Priority</option>
                          <option value="Normal">🔹 Normal</option>
                          <option value="Low">💤 Low</option>
                        </select>
                      </div>

                    </div>

                    <div className="form-field">
                      <label>Operational Decision Notes</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add directives, hazard notes, or instructions for removal crew..."
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-save-decision"
                      onClick={handleSaveDecision}
                      disabled={saving || selectedDetection.status !== "Validated"}
                    >
                      {saving ? "Saving Operational Record..." : selectedDetection.status === "Approved" ? "Already approved" : "Approve and save decision"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-selection-placeholder">
                  <p>Select an anomaly detection on the left to review details and make operational decisions.</p>
                </div>
              )}
            </div>
        </div>

      </div>
    </div>
  );
}

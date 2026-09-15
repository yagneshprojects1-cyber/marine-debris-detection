import React, { useState } from "react";
import MapPage from "../../../pages/MapPage";
import ThreeDMapPage from "../../../pages/ThreeDMapPage";
import { API_BASE_URL } from "../../../config/api";

export default function SurveyDetailModal({ survey, onClose, onUpdateDetection }) {
  const [modalView, setModalView] = useState("details"); // 'details', 'map-2d', 'map-3d'
  const [selectedDetection, setSelectedDetection] = useState(
    survey?.detections?.[0] || null
  );
  const [priority, setPriority] = useState(selectedDetection?.priority || "Normal");
  const [status, setStatus] = useState(selectedDetection?.status || "Pending Review");
  const [operator, setOperator] = useState(selectedDetection?.assigned_operator || "Unassigned");
  const [notes, setNotes] = useState(selectedDetection?.operational_notes || "");
  const [saving, setSaving] = useState(false);

  if (!survey) return null;

  const handleSelectDetection = (det) => {
    setSelectedDetection(det);
    setPriority(det.priority || "Normal");
    setStatus(det.status || "Pending Review");
    setOperator(det.assigned_operator || "Unassigned");
    setNotes(det.operational_notes || "");
  };

  const handleSaveDecision = async () => {
    if (!selectedDetection) return;
    setSaving(true);
    try {
      await onUpdateDetection({
        detection_id: selectedDetection.id,
        priority,
        status,
        assigned_operator: operator,
        operational_notes: notes,
      });
      setSelectedDetection((prev) => ({
        ...prev,
        priority,
        status,
        assigned_operator: operator,
        operational_notes: notes,
      }));
    } catch (err) {
      console.error("Failed to update detection:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manager-modal-backdrop" onClick={onClose}>
      <div className="manager-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header with 2D Map & 3D Map Action Buttons */}
        <div className="modal-header">
          <div>
            <span className="survey-id-badge">{survey.survey_id}</span>
            <h2 className="modal-title">{survey.title}</h2>
            <p className="modal-subtitle">
              Conducted by {survey.analyst_name} &bull; {survey.location}
            </p>
          </div>

          <div className="modal-nav-actions">
            <button
              type="button"
              className={`btn-modal-nav ${modalView === "details" ? "active" : ""}`}
              onClick={() => setModalView("details")}
            >
              📋 Details & Decisions
            </button>
            <button
              type="button"
              className={`btn-modal-nav ${modalView === "map-2d" ? "active" : ""}`}
              onClick={() => setModalView("map-2d")}
            >
              🗺️ 2D MAP
            </button>
            <button
              type="button"
              className={`btn-modal-nav ${modalView === "map-3d" ? "active" : ""}`}
              onClick={() => setModalView("map-3d")}
            >
              🧊 3D Map
            </button>
            <button type="button" className="btn-close-modal" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        {/* Modal View Content */}
        {modalView === "details" && (
          <div className="modal-body-layout">
            {/* Left panel: Detection list inside this survey */}
            <div className="modal-detections-list">
              <h4>Survey Detection Anomalies ({survey.detections?.length || 0})</h4>
              <div className="detection-items-scroll">
                {survey.detections?.map((det) => {
                  const isSelected = selectedDetection?.id === det.id;
                  return (
                    <div
                      key={det.id}
                      className={`detection-item-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectDetection(det)}
                    >
                      <div className="det-item-header">
                        <span className="det-name">{det.name}</span>
                        <span className={`priority-tag p-${(det.priority || "normal").toLowerCase().replace(/\s+/g, "-")}`}>
                          {det.priority || "Normal"}
                        </span>
                      </div>
                      <div className="det-item-meta">
                        <span>Conf: {((det.confidence || 0) * 100).toFixed(0)}%</span>
                        <span>Depth: {det.depth}m</span>
                      </div>
                      <div className="det-item-status">
                        <span>Status: <strong>{det.status}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel: Inspection & Operational decision controls */}
            <div className="modal-detection-detail">
              {selectedDetection ? (
                <>
                  <div className="detail-section-header">
                    <h3>Anomaly Review: {selectedDetection.name}</h3>
                    <span className="det-id-label">ID: {selectedDetection.id}</span>
                  </div>

                  {/* Object Dimensions & Position Info */}
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
                      <span className="spec-label">Local Spatial (X/Z)</span>
                      <span className="spec-val">
                        X: {selectedDetection.local_x}m / Z: {selectedDetection.local_z}m
                      </span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">Estimated Dimensions</span>
                      <span className="spec-val">
                        {selectedDetection.dimensions
                          ? `${selectedDetection.dimensions.width}m × ${selectedDetection.dimensions.length}m × ${selectedDetection.dimensions.height}m`
                          : "3.0m × 4.5m × 1.5m"}
                      </span>
                    </div>
                  </div>

                  <div className="action-button-row">
                    <button
                      type="button"
                      className="btn-modal-action-map"
                      onClick={() => setModalView("map-2d")}
                    >
                      🗺️ View on 2D MAP
                    </button>
                    <button
                      type="button"
                      className="btn-modal-action-3d"
                      onClick={() => setModalView("map-3d")}
                    >
                      🧊 View on 3D Map
                    </button>
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

                      <div className="form-field">
                        <label>Update Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                          <option value="Pending Review">⏳ Pending Review</option>
                          <option value="Validated">✅ Validated</option>
                          <option value="Assigned for Removal">⚓ Assigned for Removal</option>
                          <option value="Removed">🌊 Removed</option>
                          <option value="Rejected">❌ Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Assign Operator / Vessel</label>
                      <select value={operator} onChange={(e) => setOperator(e.target.value)}>
                        <option value="Unassigned">Unassigned</option>
                        <option value="Vessel Alpha Team">Vessel Alpha Team</option>
                        <option value="EcoClean Unit 2">EcoClean Unit 2</option>
                        <option value="Heavy Lift Operator 1">Heavy Lift Operator 1</option>
                        <option value="Deep Diver Team B">Deep Diver Team B</option>
                      </select>
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
                      disabled={saving}
                    >
                      {saving ? "Saving Operational Record..." : "Save Manager Decision"}
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
        )}

        {/* 2D MAP Pop-up View */}
        {modalView === "map-2d" && (
          <div className="modal-view-container" style={{ height: "65vh" }}>
            <MapPage
              apiBaseUrl={API_BASE_URL}
              detectionPoints={survey.detections || []}
              detectionResult={null}
            />
          </div>
        )}

        {/* 3D Map Pop-up View */}
        {modalView === "map-3d" && (
          <div className="modal-view-container" style={{ height: "65vh" }}>
            <ThreeDMapPage
              detections={survey.detections || []}
              shipLatitude={selectedDetection?.latitude}
              shipLongitude={selectedDetection?.longitude}
            />
          </div>
        )}
      </div>
    </div>
  );
}

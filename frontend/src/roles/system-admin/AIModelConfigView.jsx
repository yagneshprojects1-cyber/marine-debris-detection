import React, { useState, useEffect } from "react";

export default function AIModelConfigView({ modelConfig, onUpdateConfig, onReloadModel }) {
  const [formData, setFormData] = useState({
    active_model: "bestv2.pt",
    confidence_threshold: 0.25,
    iou_threshold: 0.45,
    max_detections_per_image: 100,
    inference_device: "CPU (Optimized)",
    auto_adaptive_filtering: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (modelConfig) {
      setFormData({
        active_model: modelConfig.active_model || "bestv2.pt",
        confidence_threshold: modelConfig.confidence_threshold ?? 0.25,
        iou_threshold: modelConfig.iou_threshold ?? 0.45,
        max_detections_per_image: modelConfig.max_detections_per_image ?? 100,
        inference_device: modelConfig.inference_device || "CPU (Optimized)",
        auto_adaptive_filtering: modelConfig.auto_adaptive_filtering ?? true,
      });
      setHasChanges(false);
    }
  }, [modelConfig]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setHasChanges(false);
  };

  const availableModels = modelConfig?.available_models || [
    { id: "bestv2.pt", name: "YOLOv8 Debris Detector v2 (PyTorch)", format: "PyTorch (.pt)", size: "21.5 MB", status: "Ready" },
    { id: "bestv2.onnx", name: "YOLOv8 Debris Detector v2 (ONNX Optimized)", format: "ONNX (.onnx)", size: "42.7 MB", status: "Ready" },
    { id: "bestv1.pt", name: "YOLOv8 Debris Baseline v1 (PyTorch)", format: "PyTorch (.pt)", size: "21.5 MB", status: "Standby" },
  ];

  const availableDevices = modelConfig?.available_devices || [
    "CPU (Optimized)",
    "Apple MPS / Metal",
    "NVIDIA CUDA (Auto)",
    "ONNX Runtime Engine",
  ];

  return (
    <div className="ai-model-config-view">
      <form onSubmit={handleSubmit}>
        {/* Available Models Grid */}
        <div className="admin-card" style={{ marginBottom: "24px" }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">🧠 Registered YOLO AI Model Checkpoints</h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Last reloaded: {modelConfig?.last_reloaded ? new Date(modelConfig.last_reloaded).toLocaleTimeString() : "Recent"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {availableModels.map((m) => {
              const isSelected = formData.active_model === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleChange("active_model", m.id)}
                  style={{
                    background: isSelected ? "rgba(2, 132, 199, 0.12)" : "#0f172a",
                    border: `1.5px solid ${isSelected ? "#38bdf8" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "10px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700, color: isSelected ? "#38bdf8" : "#f1f5f9", fontSize: "14px" }}>
                      {m.name}
                    </span>
                    {isSelected && (
                      <span className="status-pill operational" style={{ padding: "2px 8px", fontSize: "11px" }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8" }}>
                    <span>Format: {m.format}</span>
                    <span>Size: {m.size}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hyperparameters & Device Tuning */}
        <div className="admin-grid-2">
          {/* Left Column: Inference Parameters */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">🎛️ Detection Sensitivity & NMS</h3>
            </div>

            {/* Confidence Threshold */}
            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Confidence Threshold (conf_thresh)</span>
                <span className="slider-val-badge">
                  {(formData.confidence_threshold * 100).toFixed(0)}%
                </span>
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  className="admin-slider"
                  value={formData.confidence_threshold}
                  onChange={(e) => handleChange("confidence_threshold", parseFloat(e.target.value))}
                />
              </div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Minimum AI model probability required to classify an acoustic echo as marine debris.
              </span>
            </div>

            {/* IoU Threshold */}
            <div className="form-group" style={{ marginTop: "20px" }}>
              <label style={{ display: "flex", justifyContent: "space-between" }}>
                <span>IoU Overlap Threshold (NMS)</span>
                <span className="slider-val-badge">
                  {(formData.iou_threshold * 100).toFixed(0)}%
                </span>
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  className="admin-slider"
                  value={formData.iou_threshold}
                  onChange={(e) => handleChange("iou_threshold", parseFloat(e.target.value))}
                />
              </div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Non-Maximum Suppression threshold to merge overlapping bounding boxes.
              </span>
            </div>

            {/* Max Detections */}
            <div className="form-group" style={{ marginTop: "20px" }}>
              <label>Max Detections Per Frame</label>
              <input
                type="number"
                min="10"
                max="500"
                className="admin-input"
                style={{ width: "100%" }}
                value={formData.max_detections_per_image}
                onChange={(e) => handleChange("max_detections_per_image", parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          {/* Right Column: Runtime Hardware & Preprocessing */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">⚡ Hardware Accelerator & Filters</h3>
            </div>

            {/* Device Selector */}
            <div className="form-group">
              <label>Inference Runtime Device</label>
              <select
                className="admin-select"
                style={{ width: "100%" }}
                value={formData.inference_device}
                onChange={(e) => handleChange("inference_device", e.target.value)}
              >
                {availableDevices.map((dev) => (
                  <option key={dev} value={dev}>{dev}</option>
                ))}
              </select>
              <span style={{ fontSize: "11.5px", color: "#64748b", display: "block", marginTop: "4px" }}>
                Target compute backend for YOLO matrix multipliers and tensor convolutions.
              </span>
            </div>

            {/* Adaptive Noise Filtering Toggle */}
            <div className="form-group" style={{ marginTop: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0284c7" }}
                  checked={formData.auto_adaptive_filtering}
                  onChange={(e) => handleChange("auto_adaptive_filtering", e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                  Enable Adaptive Sonar Noise Filtering Pipeline
                </span>
              </label>
              <span style={{ fontSize: "11.5px", color: "#64748b", display: "block", marginTop: "6px", marginLeft: "28px" }}>
                Automatically classifies sonar speckle, gaussian, or rayleigh noise and applies the matched filter before YOLO inference.
              </span>
            </div>

            {/* Reload & Force Flush Action */}
            <div style={{ marginTop: "32px", padding: "16px", background: "#0f172a", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "13.5px" }}>Model Cache Invalidation</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Flush in-memory weights & reload from disk.</div>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={onReloadModel}
                >
                  🔄 Force Reload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={!hasChanges}
            style={{ opacity: hasChanges ? 1 : 0.6, cursor: hasChanges ? "pointer" : "default" }}
          >
            ✓ Apply AI Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
}

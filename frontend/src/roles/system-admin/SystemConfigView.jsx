import React, { useState, useEffect } from "react";

export default function SystemConfigView({ systemConfig, onUpdateConfig }) {
  const [formData, setFormData] = useState({
    max_upload_size_mb: 50,
    allowed_file_types: [".bmp", ".png", ".jpg", ".jpeg", ".xml"],
    retention_days: 30,
    auto_cleanup_temp_files: true,
    maintenance_mode: false,
    api_rate_limit_rpm: 120,
    storage_base_path: "",
    database_uri_masked: "",
    backup_frequency: "Daily at 00:00 UTC",
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (systemConfig) {
      setFormData({
        max_upload_size_mb: systemConfig.max_upload_size_mb ?? 50,
        allowed_file_types: systemConfig.allowed_file_types || [".bmp", ".png", ".jpg", ".jpeg", ".xml"],
        retention_days: systemConfig.retention_days ?? 30,
        auto_cleanup_temp_files: systemConfig.auto_cleanup_temp_files ?? true,
        maintenance_mode: systemConfig.maintenance_mode ?? false,
        api_rate_limit_rpm: systemConfig.api_rate_limit_rpm ?? 120,
        storage_base_path: systemConfig.storage_base_path || "",
        database_uri_masked: systemConfig.database_uri_masked || "",
        backup_frequency: systemConfig.backup_frequency || "Daily at 00:00 UTC",
      });
      setHasChanges(false);
    }
  }, [systemConfig]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleToggleFileType = (ext) => {
    const current = [...formData.allowed_file_types];
    const index = current.indexOf(ext);
    if (index >= 0) {
      if (current.length > 1) current.splice(index, 1);
    } else {
      current.push(ext);
    }
    handleChange("allowed_file_types", current);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setHasChanges(false);
  };

  const allFileTypes = [".bmp", ".png", ".jpg", ".jpeg", ".xml", ".tiff", ".csv"];

  return (
    <div className="system-config-view">
      <form onSubmit={handleSubmit}>
        <div className="admin-grid-2">
          {/* Storage & Data Retention Settings */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">💾 Storage & Retention Policies</h3>
            </div>

            <div className="form-group">
              <label>Max Ingestion Upload File Size (MB)</label>
              <input
                type="number"
                min="5"
                max="500"
                className="admin-input"
                style={{ width: "100%" }}
                value={formData.max_upload_size_mb}
                onChange={(e) => handleChange("max_upload_size_mb", parseInt(e.target.value, 10))}
              />
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Limits individual sonar acoustic image and XML bundle upload sizes.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: "18px" }}>
              <label>Data Retention Period (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                className="admin-input"
                style={{ width: "100%" }}
                value={formData.retention_days}
                onChange={(e) => handleChange("retention_days", parseInt(e.target.value, 10))}
              />
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Temporary preprocessed cache will be automatically purged after this window.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: "18px" }}>
              <label>Allowed Ingestion Formats</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                {allFileTypes.map((ext) => {
                  const isChecked = formData.allowed_file_types.includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => handleToggleFileType(ext)}
                      className={`btn-secondary btn-sm ${isChecked ? "btn-primary" : ""}`}
                      style={{ borderRadius: "20px" }}
                    >
                      {ext} {isChecked ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#0284c7" }}
                  checked={formData.auto_cleanup_temp_files}
                  onChange={(e) => handleChange("auto_cleanup_temp_files", e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                  Automated Temporary Image Cache Cleanup
                </span>
              </label>
            </div>
          </div>

          {/* Security, Database & Maintenance */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">🔒 Platform Security & Maintenance</h3>
            </div>

            <div className="form-group">
              <label>API Rate Limiting (Requests / Minute / IP)</label>
              <input
                type="number"
                min="10"
                max="1000"
                className="admin-input"
                style={{ width: "100%" }}
                value={formData.api_rate_limit_rpm}
                onChange={(e) => handleChange("api_rate_limit_rpm", parseInt(e.target.value, 10))}
              />
            </div>

            <div className="form-group" style={{ marginTop: "18px" }}>
              <label>MongoDB Atlas Connection (Masked)</label>
              <input
                type="text"
                disabled
                className="admin-input"
                style={{ width: "100%", opacity: 0.7, color: "#94a3b8" }}
                value={formData.database_uri_masked}
              />
            </div>

            <div className="form-group" style={{ marginTop: "18px" }}>
              <label>Automated Database Backup Schedule</label>
              <input
                type="text"
                disabled
                className="admin-input"
                style={{ width: "100%", opacity: 0.7, color: "#94a3b8" }}
                value={formData.backup_frequency}
              />
            </div>

            <div className="form-group" style={{ marginTop: "24px", padding: "16px", background: "#0f172a", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#ef4444" }}
                  checked={formData.maintenance_mode}
                  onChange={(e) => handleChange("maintenance_mode", e.target.checked)}
                />
                <div>
                  <span style={{ fontWeight: 700, color: "#f87171" }}>
                    Enable Platform Maintenance Mode
                  </span>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>
                    Restricts sonar uploads and inference requests for non-administrative users during scheduled updates.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Changes */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={!hasChanges}
            style={{ opacity: hasChanges ? 1 : 0.6, cursor: hasChanges ? "pointer" : "default" }}
          >
            ✓ Save System Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

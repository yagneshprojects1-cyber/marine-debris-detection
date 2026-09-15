import React from "react";

export default function SystemAdminDashboard({ dashboardData, onNavigateTab, onReloadModel }) {
  if (!dashboardData) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        Loading System Dashboard telemetry...
      </div>
    );
  }

  const {
    total_users = 0,
    active_users = 0,
    inactive_users = 0,
    role_distribution = {},
    system_status = "Operational",
    system_health = {},
    ai_model_status = {},
    processing_status = {},
    storage_status = {},
  } = dashboardData;

  const isOperational = system_status.toLowerCase() === "operational";

  return (
    <div className="admin-dashboard-view">
      {/* 4 Stat Cards */}
      <div className="admin-grid-4">
        {/* Total & Active Users */}
        <div className="admin-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Platform Users</span>
            <span className="stat-icon">👥</span>
          </div>
          <div className="stat-value">{total_users}</div>
          <div className="stat-subtext" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#4ade80" }}>● {active_users} Active</span>
            <span style={{ color: "#94a3b8" }}>● {inactive_users} Inactive</span>
          </div>
        </div>

        {/* System Health */}
        <div className="admin-card stat-card">
          <div className="stat-header">
            <span className="stat-label">System Health</span>
            <span className="stat-icon">⚡</span>
          </div>
          <div className="stat-value" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className={`status-pill ${isOperational ? "operational" : "warning"}`}>
              <span className="status-dot" />
              {system_status}
            </span>
          </div>
          <div className="stat-subtext">
            Uptime: {system_health.uptime_formatted || "Calculating..."}
          </div>
        </div>

        {/* AI Model Runtime */}
        <div className="admin-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Active AI Model</span>
            <span className="stat-icon">🧠</span>
          </div>
          <div className="stat-value" style={{ fontSize: "20px", color: "#38bdf8", marginTop: "14px" }}>
            {ai_model_status.active_model}
          </div>
          <div className="stat-subtext">
            Conf: {(ai_model_status.confidence_threshold * 100).toFixed(0)}% | Device: {ai_model_status.inference_device}
          </div>
        </div>

        {/* Storage Quota */}
        <div className="admin-card stat-card">
          <div className="stat-header">
            <span className="stat-label">App Data Storage</span>
            <span className="stat-icon">💾</span>
          </div>
          <div className="stat-value">{storage_status.total_storage_used_mb || 0} <span style={{ fontSize: "16px", color: "#94a3b8" }}>MB</span></div>
          <div className="stat-subtext">
            {storage_status.total_files_stored || 0} Files in Uploads & Detections
          </div>
        </div>
      </div>

      {/* 2-Column Detail Cards */}
      <div className="admin-grid-2">
        {/* Left: Processing Engine & AI Telemetry */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">⚙️ AI Inference & Queue Status</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onReloadModel}
            >
              🔄 Reload Model
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#0f172a", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8" }}>Queue Status</span>
              <span style={{ fontWeight: 600, color: "#4ade80" }}>{processing_status.queue_state}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#0f172a", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8" }}>Avg Inference Latency</span>
              <span style={{ fontWeight: 600, color: "#38bdf8" }}>{processing_status.avg_inference_latency_ms} ms</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#0f172a", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8" }}>Tasks Handled Today</span>
              <span style={{ fontWeight: 600, color: "#f8fafc" }}>{processing_status.jobs_completed_today} Completed / {processing_status.jobs_failed_today} Failed</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#0f172a", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8" }}>Database Connection (Atlas)</span>
              <span style={{ fontWeight: 600, color: system_health.database_connected ? "#4ade80" : "#f87171" }}>
                {system_health.database_connected ? `Connected (${system_health.database_latency_ms} ms)` : "Disconnected (Fallback mode)"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: User Role Distribution & Quick Nav */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">👥 User Role Allocation</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onNavigateTab("users")}
            >
              Manage Users →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#38bdf8", fontWeight: 600 }}>🔬 Sonar Analysts</span>
                <span>{role_distribution["Sonar Analysts"] || 0} users</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-cyan" style={{ width: `${((role_distribution["Sonar Analysts"] || 0) / Math.max(total_users, 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#c084fc", fontWeight: 600 }}>📊 Supervisors / Managers</span>
                <span>{role_distribution["Supervisors / Managers"] || 0} users</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-emerald" style={{ width: `${((role_distribution["Supervisors / Managers"] || 0) / Math.max(total_users, 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>🚢 Marine Debris Removal Operators</span>
                <span>{role_distribution["Marine Debris Removal Operators"] || 0} users</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-amber" style={{ width: `${((role_distribution["Marine Debris Removal Operators"] || 0) / Math.max(total_users, 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#f87171", fontWeight: 600 }}>🖥️ System Administrators</span>
                <span>{role_distribution["System Administrators"] || 0} users</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-rose" style={{ width: `${((role_distribution["System Administrators"] || 0) / Math.max(total_users, 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Hardware Live Telemetry */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">📊 Storage Utilization Breakdown</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onNavigateTab("system-config")}
            >
              Storage Settings →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#94a3b8" }}>Raw Sonar Uploads (uploads/)</span>
              <span style={{ fontWeight: 600 }}>{storage_status.upload_dir_mb} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#94a3b8" }}>Annotated Detection Results (results/)</span>
              <span style={{ fontWeight: 600 }}>{storage_status.results_dir_mb} MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "#94a3b8" }}>AI Model Weights & Classifiers (models/)</span>
              <span style={{ fontWeight: 600 }}>{storage_status.models_dir_mb} MB</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span style={{ color: "#f1f5f9", fontWeight: 600 }}>Total App Footprint</span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>{storage_status.total_storage_used_mb} MB</span>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🖥️ Server Hardware Telemetry</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onNavigateTab("health-logs")}
            >
              System Logs →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#94a3b8" }}>CPU Load</span>
                <span style={{ fontWeight: 600 }}>{system_health.cpu_usage_percent}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-cyan" style={{ width: `${system_health.cpu_usage_percent}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#94a3b8" }}>RAM Memory</span>
                <span style={{ fontWeight: 600 }}>{system_health.memory_usage_percent}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-emerald" style={{ width: `${system_health.memory_usage_percent}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#94a3b8" }}>Host Disk Space</span>
                <span style={{ fontWeight: 600 }}>{system_health.disk_usage_percent}% ({system_health.disk_free_gb} GB Free)</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill fill-amber" style={{ width: `${system_health.disk_usage_percent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

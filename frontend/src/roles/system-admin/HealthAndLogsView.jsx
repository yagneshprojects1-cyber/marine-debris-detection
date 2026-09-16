import React, { useState } from "react";

export default function HealthAndLogsView({
  healthData,
  logs,
  onRefreshHealth,
  onFilterLogs,
  onClearLogs,
}) {
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    onFilterLogs(lvl, searchQuery);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    onFilterLogs(selectedLevel, val);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ["ID", "Timestamp", "Level", "Actor", "Action", "Details", "IP Address"];
    const rows = logs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      l.level,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      l.ip_address || "127.0.0.1",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatLogTimestamp = (raw) => {
    if (!raw) return "—";
    try {
      let dateStr = String(raw);
      // Ensure ISO string has explicit UTC specifier if missing
      if (!dateStr.endsWith("Z") && !dateStr.includes("+") && !(dateStr.length > 19 && dateStr.slice(10).includes("-"))) {
        dateStr += "Z";
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(raw);

      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return String(raw);
    }
  };

  const formatLogDateTooltip = (raw) => {
    if (!raw) return "";
    try {
      let dateStr = String(raw);
      if (!dateStr.endsWith("Z") && !dateStr.includes("+") && !(dateStr.length > 19 && dateStr.slice(10).includes("-"))) {
        dateStr += "Z";
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleString();
    } catch {
      return String(raw);
    }
  };

  const isOperational = (healthData?.status || "").toLowerCase() === "operational";

  return (
    <div className="health-logs-view">
      {/* Live Health Overview */}
      <div className="admin-card" style={{ marginBottom: "24px" }}>
        <div className="admin-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className="admin-card-title">🩺 Live System Health & Telemetry</h3>
            <span className={`status-pill ${isOperational ? "operational" : "warning"}`}>
              <span className="status-dot" />
              {healthData?.status || "Checking..."}
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onRefreshHealth}
          >
            🔄 Refresh Telemetry
          </button>
        </div>

        <div className="admin-grid-4" style={{ marginBottom: "0" }}>
          <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>CPU Core Load</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>
              {healthData?.cpu_usage_percent || 0}%
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Virtual RAM Usage</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#34d399", marginTop: "4px" }}>
              {healthData?.memory_usage_percent || 0}%
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Host Disk Usage</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#fbbf24", marginTop: "4px" }}>
              {healthData?.disk_usage_percent || 0}% ({healthData?.disk_free_gb || 0} GB Free)
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Database Latency</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: healthData?.database_connected ? "#4ade80" : "#f87171", marginTop: "4px" }}>
              {healthData?.database_connected ? `${healthData?.database_latency_ms} ms` : "Offline"}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <h3 className="admin-card-title">📜 System & Security Audit Trail</h3>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter buttons */}
            {["ALL", "INFO", "AUDIT", "WARNING", "ERROR"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`btn-secondary btn-sm ${selectedLevel === lvl ? "btn-primary" : ""}`}
                onClick={() => handleLevelChange(lvl)}
              >
                {lvl}
              </button>
            ))}

            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              className="admin-input"
              style={{ width: "180px", padding: "6px 10px", fontSize: "12.5px" }}
              value={searchQuery}
              onChange={handleSearchChange}
            />

            {/* Export Buttons */}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleExportCSV}
              title="Export as CSV"
            >
              📥 CSV
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleExportJSON}
              title="Export as JSON"
            >
              📥 JSON
            </button>

            {/* Clear logs */}
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => {
                if (window.confirm("Purge archived audit trail logs?")) {
                  onClearLogs();
                }
              }}
            >
              Purge
            </button>
          </div>
        </div>

        <div className="log-stream-container">
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
              No audit log records found for the current query.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-time" title={formatLogDateTooltip(log.timestamp)}>
                  {formatLogTimestamp(log.timestamp)}
                </span>
                <span className={`log-level-badge ${log.level}`}>
                  {log.level}
                </span>
                <span className="log-actor">[{log.actor}]</span>
                <div style={{ flex: 1 }}>
                  <span className="log-action">{log.action}: </span>
                  <span className="log-details">{log.details}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {log.ip_address || "127.0.0.1"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

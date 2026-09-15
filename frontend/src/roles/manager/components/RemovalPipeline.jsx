import React, { useState } from "react";

export default function RemovalPipeline({ detections, onUpdateDetection }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredDetections = detections.filter((det) => {
    if (filterPriority !== "all" && det.priority !== filterPriority) return false;
    if (filterStatus !== "all" && det.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = det.name?.toLowerCase().includes(q);
      const matchSurvey = det.survey_id?.toLowerCase().includes(q);
      const matchNotes = det.operational_notes?.toLowerCase().includes(q);
      if (!matchName && !matchSurvey && !matchNotes) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDetections.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDetections = filteredDetections.slice(startIndex, startIndex + itemsPerPage);

  const handleExportOperationalReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      manager_report_title: "Marine Debris Removal Operations & Assignment Report",
      total_items: filteredDetections.length,
      items: filteredDetections.map((det) => ({
        id: det.id,
        survey_id: det.survey_id,
        name: det.name,
        priority: det.priority,
        status: det.status,
        operator: det.assigned_operator,
        coordinates: { lat: det.latitude, lon: det.longitude, depth: det.depth },
        dimensions: det.dimensions,
        notes: det.operational_notes,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manager-operational-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="removal-pipeline-container">
      <div className="pipeline-header">
        <div>
          <h2>Operational Removal Pipeline</h2>
          <p className="pipeline-subtitle">
            Assign validated debris for removal and update removal status.
          </p>
        </div>
        <button
          type="button"
          className="btn-export-report"
          onClick={handleExportOperationalReport}
        >
          📄 Export Operations Report
        </button>
      </div>

      <div className="pipeline-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, survey ID, or notes..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="operator-select-filter"
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Priority (All)</option>
          <option value="High Priority">⚠️ High Priority</option>
          <option value="Medium Priority">🔶 Medium Priority</option>
          <option value="Normal">🔹 Normal</option>
        </select>

        <select
          className="operator-select-filter"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Status (All)</option>
          <option value="Pending Review">⏳ Pending Review</option>
          <option value="Validated">✅ Validated</option>
          <option value="Assigned for Removal">⚓ Assigned for Removal</option>
          <option value="Removed">🌊 Removed</option>
        </select>
      </div>

      <div className="pipeline-table-wrapper">
        <table className="pipeline-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Survey ID</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned Operator</th>
              <th>Depth / Position</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDetections.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  No debris targets match your search/filters or no detections available in database.
                </td>
              </tr>
            ) : (
              paginatedDetections.map((det) => (
                <tr key={det.id}>
                  <td>
                    <strong>{det.name}</strong>
                    <span className="sub-id">ID: {det.id}</span>
                  </td>
                  <td>
                    <span className="survey-pill">{det.survey_id}</span>
                  </td>
                  <td>
                    <select
                      className={`priority-select p-${(det.priority || "normal").toLowerCase().replace(/\s+/g, "-")}`}
                      value={det.priority || "Normal"}
                      onChange={(e) => onUpdateDetection({ detection_id: det.id, priority: e.target.value })}
                    >
                      <option value="High Priority">High Priority</option>
                      <option value="Medium Priority">Medium Priority</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className={`status-select s-${(det.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}
                      value={det.status || "Pending Review"}
                      onChange={(e) => onUpdateDetection({ detection_id: det.id, status: e.target.value })}
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="Validated">Validated</option>
                      <option value="Assigned for Removal">Assigned for Removal</option>
                      <option value="Removed">Removed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="operator-select"
                      value={det.assigned_operator || "Unassigned"}
                      onChange={(e) => onUpdateDetection({ detection_id: det.id, assigned_operator: e.target.value })}
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="Vessel Alpha Team">Vessel Alpha Team</option>
                      <option value="EcoClean Unit 2">EcoClean Unit 2</option>
                      <option value="Heavy Lift Operator 1">Heavy Lift Operator 1</option>
                      <option value="Deep Diver Team B">Deep Diver Team B</option>
                    </select>
                  </td>
                  <td>
                    <span className="coords-text">
                      {det.latitude?.toFixed(4)}, {det.longitude?.toFixed(4)}
                    </span>
                    <span className="depth-text">Depth: {det.depth}m</span>
                  </td>
                  <td>
                    <span className="notes-cell-text">{det.operational_notes || "No notes"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (10 records each) */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            &laquo; Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredDetections.length} total targets)
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}

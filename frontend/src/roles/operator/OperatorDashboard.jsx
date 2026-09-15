import React, { useEffect, useState } from "react";
import "./OperatorDashboard.css";
import MapPage from "../../pages/MapPage";
import RouteOptimizationPage from "../../pages/RouteOptimizationPage";
import { API_BASE_URL } from "../../config/api";

export default function OperatorDashboard({ activeTab = "my-tasks" }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalView, setModalView] = useState("details"); // 'details' or 'map-2d'
  const [confirmingId, setConfirmingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/operator/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Error loading operator removal tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleConfirmRemoval = async (task) => {
    try {
      setConfirmingId(task.id || task.task_id);
      const res = await fetch(`${API_BASE_URL}/api/operator/confirm-removal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id || task.task_id,
          status: "Removed",
          operator_notes: "Removal confirmed and target extracted by Operator.",
        }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id || t.task_id === task.task_id ? { ...t, status: "Removed" } : t))
        );
        if (selectedTask && (selectedTask.id === task.id || selectedTask.task_id === task.task_id)) {
          setSelectedTask((prev) => ({ ...prev, status: "Removed" }));
        }
      }
    } catch (err) {
      console.error("Failed to confirm removal:", err);
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterPriority !== "all" && !task.priority?.toLowerCase().includes(filterPriority.toLowerCase())) return false;
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = task.task_id?.toLowerCase().includes(q);
      const matchType = (task.type || task.name)?.toLowerCase().includes(q);
      const matchNotes = task.operational_notes?.toLowerCase().includes(q);
      if (!matchId && !matchType && !matchNotes) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const getPriorityBadge = (priority) => {
    const p = (priority || "Normal").toLowerCase();
    if (p.includes("high")) {
      return <span className="p-badge p-high">🔴 High</span>;
    }
    if (p.includes("medium")) {
      return <span className="p-badge p-medium">🟠 Medium</span>;
    }
    return <span className="p-badge p-low">🟢 Low</span>;
  };

  const getStatusBadge = (status) => {
    if (status === "Removed") {
      return <span className="s-badge s-removed">🌊 Removal Confirmed</span>;
    }
    if (status === "In Progress") {
      return <span className="s-badge s-progress">⏳ In Progress</span>;
    }
    return <span className="s-badge s-assigned">🟡 Assigned</span>;
  };

  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setModalView("details");
  };

  return (
    <div className="operator-dashboard-page">
      <div className="operator-dashboard-inner">
        {/* Workspace Top Header */}
        <header className="operator-header">
          <div>
            <span className="role-eyebrow">Marine Debris Removal Operator Workspace</span>
            <h1 className="operator-page-title">Assigned Debris Removal Tasks</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-sync-tasks"
              onClick={fetchTasks}
              disabled={loading}
            >
              {loading ? "Syncing Tasks..." : "🔄 Sync My Tasks"}
            </button>
          </div>
        </header>

        {/* MY ASSIGNED TASKS LIST TABLE */}
        {activeTab === "my-tasks" && (
          <section className="operator-section">
            <div className="operator-panel">
              <div className="panel-header">
                <div>
                  <h2>MY TASKS</h2>
                  <p className="panel-subtitle">Review assigned debris targets, inspect coordinates, and confirm extraction.</p>
                </div>
                <span className="task-count-pill">{filteredTasks.length} Assigned Tasks</span>
              </div>

              {/* Filter controls bar for Status, Priority, and Search */}
              <div className="operator-filter-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by Task ID, object type, or directives..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                <select
                  className="filter-select"
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Priority (All)</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟠 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>

                <select
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Status (All)</option>
                  <option value="Assigned">🟡 Assigned</option>
                  <option value="In Progress">⏳ In Progress</option>
                  <option value="Removed">🌊 Removal Confirmed</option>
                </select>
              </div>

              <div className="operator-table-wrapper">
                <table className="operator-table">
                  <thead>
                    <tr>
                      <th>Removal Task</th>
                      <th>Object Type</th>
                      <th>Priority</th>
                      <th>Location Coordinates</th>
                      <th>Seabed Depth</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                          No removal tasks match your filter criteria or no tasks currently assigned to your crew.
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((t) => (
                        <tr key={t.id || t.task_id} className="operator-task-row">
                          <td>
                            <strong className="task-id-text">{t.task_id}</strong>
                            <span className="survey-sub-pill">{t.survey_id}</span>
                          </td>
                          <td>
                            <strong className="object-type-text">{t.type || t.name}</strong>
                          </td>
                          <td>{getPriorityBadge(t.priority)}</td>
                          <td>
                            <span className="coords-mono">
                              {t.latitude?.toFixed(5)} N, {t.longitude?.toFixed(5)} E
                            </span>
                          </td>
                          <td>
                            <span className="depth-badge">{t.depth} meters</span>
                          </td>
                          <td>{getStatusBadge(t.status)}</td>
                          <td>
                            <div className="table-action-btns">
                              <button
                                type="button"
                                className="btn-view-details"
                                onClick={() => handleOpenTaskDetails(t)}
                              >
                                View Details &rarr;
                              </button>
                              {t.status !== "Removed" && (
                                <button
                                  type="button"
                                  className="btn-confirm-removal"
                                  onClick={() => handleConfirmRemoval(t)}
                                  disabled={confirmingId === (t.id || t.task_id)}
                                >
                                  {confirmingId === (t.id || t.task_id) ? "Confirming..." : "Confirm Removal"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 10 Records Pagination */}
              {totalPages > 1 && (
                <div className="operator-pagination-bar">
                  <button
                    type="button"
                    className="op-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    &laquo; Previous
                  </button>
                  <span className="op-page-info">
                    Page {currentPage} of {totalPages} ({filteredTasks.length} total tasks)
                  </span>
                  <button
                    type="button"
                    className="op-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    Next &raquo;
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Route Optimization */}
        {activeTab === "route-optimization" && (
          <section className="operator-section">
            <RouteOptimizationPage apiBaseUrl={API_BASE_URL} />
          </section>
        )}

        {/* TASK DETECTION DETAILS & 2D MAP POP-UP MODAL */}
        {selectedTask && (
          <div className="operator-modal-backdrop" onClick={() => setSelectedTask(null)}>
            <div className="operator-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="op-modal-header">
                <div>
                  <span className="task-modal-pill">{selectedTask.task_id}</span>
                  <h2>REMOVAL TASK DETAILS</h2>
                </div>
                <div className="op-modal-actions-bar">
                  <button
                    type="button"
                    className={`btn-op-nav ${modalView === "details" ? "active" : ""}`}
                    onClick={() => setModalView("details")}
                  >
                    📋 Details
                  </button>
                  <button
                    type="button"
                    className={`btn-op-nav ${modalView === "map-2d" ? "active" : ""}`}
                    onClick={() => setModalView("map-2d")}
                  >
                    🗺️ 2D MAP
                  </button>
                  <button type="button" className="op-close-btn" onClick={() => setSelectedTask(null)}>
                    &times;
                  </button>
                </div>
              </div>

              {modalView === "details" && (
                <div className="op-modal-body">
                  {/* Left side: Detection Specs & Image */}
                  <div className="op-modal-specs">
                    <div className="spec-item-group">
                      <span className="spec-title">Object Type</span>
                      <strong className="spec-val-lg">{selectedTask.type || selectedTask.name}</strong>
                    </div>

                    <div className="spec-item-group">
                      <span className="spec-title">Priority Level</span>
                      {getPriorityBadge(selectedTask.priority)}
                    </div>

                    <div className="spec-item-group">
                      <span className="spec-title">Target Location</span>
                      <strong className="spec-val">
                        Latitude: {selectedTask.latitude?.toFixed(5)} N<br />
                        Longitude: {selectedTask.longitude?.toFixed(5)} E
                      </strong>
                    </div>

                    <div className="spec-item-group">
                      <span className="spec-title">Seabed Depth</span>
                      <strong className="spec-val">{selectedTask.depth} meters</strong>
                    </div>

                    <div className="spec-item-group">
                      <span className="spec-title">AI Detection Confidence</span>
                      <strong className="spec-val">
                        {((selectedTask.confidence || 0.90) * 100).toFixed(1)}% Certainty
                      </strong>
                    </div>

                    <div className="spec-item-group">
                      <span className="spec-title">Status</span>
                      {getStatusBadge(selectedTask.status)}
                    </div>

                    <button
                      type="button"
                      className="btn-open-map-inside"
                      onClick={() => setModalView("map-2d")}
                    >
                      🗺️ View on 2D Location Map &rarr;
                    </button>
                  </div>

                  {/* Right side: Sonar Image & Manager Directives */}
                  <div className="op-modal-preview">
                    <h4>Sonar Detection Image</h4>
                    <div className="image-frame-placeholder">
                      <div className="fake-sonar-box">
                        <span>DEF-SONAR-SCAN</span>
                        <p>Target Anomaly: <strong>{selectedTask.name}</strong></p>
                        <p>Coordinates: {selectedTask.latitude?.toFixed(4)}, {selectedTask.longitude?.toFixed(4)}</p>
                      </div>
                    </div>

                    <h4>Manager Operational Directives</h4>
                    <p className="directives-text">
                      "{selectedTask.operational_notes || "Perform standard retrieval procedure and confirm removal upon extraction."}"
                    </p>

                    <div className="op-confirm-box">
                      {selectedTask.status === "Removed" ? (
                        <div className="confirmed-banner">
                          ✓ Removal Confirmed & Extracted
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-confirm-large"
                          onClick={() => handleConfirmRemoval(selectedTask)}
                          disabled={confirmingId === (selectedTask.id || selectedTask.task_id)}
                        >
                          {confirmingId === (selectedTask.id || selectedTask.task_id)
                            ? "Saving Confirmation..."
                            : "🌊 Confirm Target Removal"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2D MAP POPUP VIEW INSIDE MODAL */}
              {modalView === "map-2d" && (
                <div style={{ height: "60vh", width: "100%" }}>
                  <MapPage
                    apiBaseUrl={API_BASE_URL}
                    detectionPoints={[selectedTask]}
                    detectionResult={null}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import "./OperatorDashboard.css";
import MapPage from "../../pages/MapPage";
import RouteOptimizationPage from "../../pages/RouteOptimizationPage";
import HistoryPage from "../../pages/HistoryPage";
import { API_BASE_URL } from "../../config/api";

export default function OperatorDashboard({ activeTab = "my-tasks", username }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [modalView, setModalView] = useState("details"); // 'details' or 'map-2d'
  const [confirmingId, setConfirmingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/operator/tasks?username=${encodeURIComponent(username || "")}`);
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
  }, [username]);

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
    if (task.status === "Removed") return false;
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

  const taskGroups = Object.values(filteredTasks.reduce((groups, task) => {
    const groupId = task.group_id || "Ungrouped tasks";
    if (!groups[groupId]) {
      groups[groupId] = { groupId, latitude: 0, longitude: 0, tasks: [] };
    }
    groups[groupId].tasks.push(task);
    groups[groupId].latitude = groups[groupId].tasks.reduce((sum, item) => sum + (Number(item.latitude) || 0), 0) / groups[groupId].tasks.length;
    groups[groupId].longitude = groups[groupId].tasks.reduce((sum, item) => sum + (Number(item.longitude) || 0), 0) / groups[groupId].tasks.length;
    return groups;
  }, {})).filter((group) => group.tasks.length > 0);

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

        {/* MY ASSIGNED TASKS GROUPS */}
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
                  }}
                />

                <select
                  className="filter-select"
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
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
                  }}
                >
                  <option value="all">Status (All)</option>
                  <option value="Assigned">🟡 Assigned</option>
                  <option value="In Progress">⏳ In Progress</option>
                  <option value="Removed">🌊 Removal Confirmed</option>
                </select>
              </div>

              <div className="operator-groups-grid">
                {taskGroups.map((group) => (
                  <article className="operator-group-card" key={group.groupId}>
                    <div className="operator-group-header">
                      <div>
                        <span className="survey-sub-pill">{group.groupId}</span>
                        <h3>{group.tasks.length} Assigned Debris</h3>
                      </div>
                      <span className="coords-mono">{group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}</span>
                    </div>
                    <div className="operator-group-targets">
                      {group.tasks.map((task) => (
                        <div className="operator-group-target" key={task.id || task.task_id}>
                          <strong>{task.name || task.type}</strong>
                          <span>{task.latitude?.toFixed(5)} N, {task.longitude?.toFixed(5)} E</span>
                          {getStatusBadge(task.status)}
                          {task.status !== "Removed" && (
                            <button
                              type="button"
                              className="btn-confirm-removal"
                              onClick={() => handleConfirmRemoval(task)}
                              disabled={confirmingId === (task.id || task.task_id)}
                            >
                              {confirmingId === (task.id || task.task_id) ? "Removing..." : "Removed"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="operator-group-actions">
                      <button type="button" className="btn-view-details" onClick={() => handleOpenTaskDetails(group.tasks[0])}>
                        View Details &rarr;
                      </button>
                      <button
                        type="button"
                        className="btn-confirm-removal"
                        onClick={() => setSelectedGroup(group)}
                      >
                        Route Optimization
                      </button>
                    </div>
                  </article>
                ))}
              </div>

            </div>
          </section>
        )}

        {activeTab === "operator-history" && (
          <HistoryPage
            apiBaseUrl={API_BASE_URL}
            operatorName={username}
            showGroupColumn
          />
        )}

        {/* Route Optimization */}
        {activeTab === "route-optimization" && (
          <section className="operator-section">
            <RouteOptimizationPage apiBaseUrl={API_BASE_URL} />
          </section>
        )}

        {selectedGroup && (
          <div className="operator-modal-backdrop" onClick={() => setSelectedGroup(null)}>
            <div className="operator-route-modal" onClick={(event) => event.stopPropagation()}>
              <div className="op-modal-header">
                <div>
                  <span className="task-modal-pill">{selectedGroup.surveyId}</span>
                  <h2>GROUP ROUTE OPTIMIZATION</h2>
                </div>
                <button type="button" className="op-close-btn" onClick={() => setSelectedGroup(null)}>&times;</button>
              </div>
              <RouteOptimizationPage
                apiBaseUrl={API_BASE_URL}
                initialTargets={selectedGroup.tasks.map((task) => ({
                  id: task.id || task.task_id,
                  name: task.name || task.type,
                  latitude: Number(task.latitude) || 0,
                  longitude: Number(task.longitude) || 0,
                }))}
              />
            </div>
          </div>
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

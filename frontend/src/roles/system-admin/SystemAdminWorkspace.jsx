import React, { useState, useEffect, useCallback } from "react";
import "./SystemAdmin.css";
import SystemAdminDashboard from "./SystemAdminDashboard";
import UserManagementView from "./UserManagementView";
import AIModelConfigView from "./AIModelConfigView";
import SystemConfigView from "./SystemConfigView";
import HealthAndLogsView from "./HealthAndLogsView";
import AdminIcon from "./AdminIcon";

export default function SystemAdminWorkspace({
  apiBaseUrl,
  activeAdminTab = "dashboard",
  onNavigateTab,
}) {
  const [currentTab, setCurrentTab] = useState(activeAdminTab);
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [modelConfig, setModelConfig] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync external active tab if changed
  useEffect(() => {
    if (activeAdminTab) {
      setCurrentTab(activeAdminTab);
    }
  }, [activeAdminTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTabSwitch = (tabId) => {
    setCurrentTab(tabId);
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
  };

  // ── Fetch Operations ───────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
      console.error("Failed to load admin dashboard:", e);
    }
  }, [apiBaseUrl]);

  const fetchUsers = useCallback(async (role = null) => {
    try {
      const url = role && role !== "ALL"
        ? `${apiBaseUrl}/api/admin/users?role=${encodeURIComponent(role)}`
        : `${apiBaseUrl}/api/admin/users`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  }, [apiBaseUrl]);

  const fetchModelConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/model-config`);
      if (res.ok) {
        const data = await res.json();
        setModelConfig(data);
      }
    } catch (e) {
      console.error("Failed to load model config:", e);
    }
  }, [apiBaseUrl]);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/system-config`);
      if (res.ok) {
        const data = await res.json();
        setSystemConfig(data);
      }
    } catch (e) {
      console.error("Failed to load system config:", e);
    }
  }, [apiBaseUrl]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (e) {
      console.error("Failed to load health telemetry:", e);
    }
  }, [apiBaseUrl]);

  const fetchLogs = useCallback(async (level = "ALL", search = "") => {
    try {
      let url = `${apiBaseUrl}/api/admin/logs?level=${level}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
  }, [apiBaseUrl]);

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchUsers();
    fetchModelConfig();
    fetchSystemConfig();
    fetchHealth();
    fetchLogs();
  }, [fetchDashboard, fetchUsers, fetchModelConfig, fetchSystemConfig, fetchHealth, fetchLogs]);

  // Periodic health poll every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealth();
      fetchDashboard();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchDashboard]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateUser = async (newUserData) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });
      if (res.ok) {
        showToast(`User account created for ${newUserData.name}`);
        fetchUsers();
        fetchDashboard();
        fetchLogs();
      }
    } catch (e) {
      console.error("Error creating user:", e);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showToast("User updated successfully");
        fetchUsers();
        fetchDashboard();
        fetchLogs();
      }
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("User deleted successfully");
        fetchUsers();
        fetchDashboard();
        fetchLogs();
      }
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  const handleUpdateModelConfig = async (newConfig) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/model-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const updated = await res.json();
        setModelConfig(updated);
        showToast("AI Model configuration updated");
        fetchDashboard();
        fetchLogs();
      }
    } catch (e) {
      console.error("Error updating model config:", e);
    }
  };

  const handleReloadModel = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/model-config/reload`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("YOLO model cache cleared and reloaded");
        fetchModelConfig();
        fetchDashboard();
        fetchLogs();
      }
    } catch (e) {
      console.error("Error reloading model:", e);
    }
  };

  const handleUpdateSystemConfig = async (newConfig) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/system-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const updated = await res.json();
        setSystemConfig(updated);
        showToast("System configuration saved");
        fetchLogs();
      }
    } catch (e) {
      console.error("Error updating system config:", e);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/logs/clear`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Audit logs purged");
        fetchLogs();
      }
    } catch (e) {
      console.error("Error clearing logs:", e);
    }
  };

  return (
    <main className="admin-workspace">
      {/* Tab Views */}
      {currentTab === "dashboard" && (
        <SystemAdminDashboard
          dashboardData={dashboardData}
          onNavigateTab={handleTabSwitch}
          onReloadModel={handleReloadModel}
        />
      )}

      {currentTab === "users" && (
        <UserManagementView
          users={users}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {currentTab === "ai-config" && (
        <AIModelConfigView
          modelConfig={modelConfig}
          onUpdateConfig={handleUpdateModelConfig}
          onReloadModel={handleReloadModel}
        />
      )}

      {currentTab === "system-config" && (
        <SystemConfigView
          systemConfig={systemConfig}
          onUpdateConfig={handleUpdateSystemConfig}
        />
      )}

      {currentTab === "health-logs" && (
        <HealthAndLogsView
          healthData={healthData}
          logs={logs}
          onRefreshHealth={fetchHealth}
          onFilterLogs={fetchLogs}
          onClearLogs={handleClearLogs}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast">
          <AdminIcon name="check" />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}

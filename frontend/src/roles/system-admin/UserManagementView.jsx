import React, { useState } from "react";
import AdminIcon from "./AdminIcon";
import { useAlert } from "../../components/AlertContext";

const ROLES = [
  "Sonar Analyst",
  "Supervisor / Manager",
  "Marine Debris Removal Operator",
  "System Administrator",
];

export default function UserManagementView({ users = [], onCreateUser, onUpdateUser, onDeleteUser }) {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { showConfirm } = useAlert();

  // Form states for new/edit user
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Sonar Analyst",
    status: "Active",
    permissions: {
      can_upload_sonar: true,
      can_run_ai: true,
      can_manage_users: false,
      can_configure_system: false,
      can_export_reports: true,
      can_dispatch_operators: false,
    },
  });

  const getUserName = (user) => user.name || user.username || "Unnamed user";
  const getUserEmail = (user) => user.email || user.username || "No email address";

  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;
    const userName = getUserName(u).toLowerCase();
    const userEmail = getUserEmail(u).toLowerCase();
    const userRole = String(u.role || "").toLowerCase();
    const matchesSearch =
      userName.includes(searchQuery.toLowerCase()) ||
      userEmail.includes(searchQuery.toLowerCase()) ||
      userRole.includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleClass = (role) => {
    switch (role) {
      case "Sonar Analyst":
        return "analyst";
      case "Supervisor / Manager":
        return "supervisor";
      case "Marine Debris Removal Operator":
        return "operator";
      case "System Administrator":
        return "admin";
      default:
        return "analyst";
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "Sonar Analyst",
      status: "Active",
      permissions: {
        can_upload_sonar: true,
        can_run_ai: true,
        can_manage_users: false,
        can_configure_system: false,
        can_export_reports: true,
        can_dispatch_operators: false,
      },
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: getUserName(user),
      email: getUserEmail(user),
      password: "",
      role: user.role,
      status: user.status,
      permissions: { ...user.permissions },
    });
    setIsCreateModalOpen(true);
  };

  const handleRoleChangeInForm = (newRole) => {
    const isSysAdmin = newRole === "System Administrator";
    const isSupervisor = newRole === "Supervisor / Manager";
    const isOperator = newRole === "Marine Debris Removal Operator";
    const isAnalyst = newRole === "Sonar Analyst";

    setFormData({
      ...formData,
      role: newRole,
      permissions: {
        can_upload_sonar: isAnalyst || isSupervisor,
        can_run_ai: isAnalyst || isSupervisor || isSysAdmin,
        can_manage_users: isSysAdmin,
        can_configure_system: isSysAdmin,
        can_export_reports: true,
        can_dispatch_operators: isSupervisor || isOperator,
      },
    });
  };

  const handleTogglePermission = (permKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permKey]: !formData.permissions[permKey],
      },
    });
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    onUpdateUser(user.id, { status: newStatus });
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      const { password, ...updates } = formData;
      onUpdateUser(editingUser.id, updates);
    } else {
      onCreateUser(formData);
    }
    setIsCreateModalOpen(false);
  };

  return (
    <div className="user-management-view">
      {/* Top Filter & Action Bar */}
      <div className="admin-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          {/* Role Filter Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn-secondary btn-sm ${selectedRoleFilter === "ALL" ? "btn-primary" : ""}`}
              onClick={() => setSelectedRoleFilter("ALL")}
            >
              All Roles ({users.length})
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${selectedRoleFilter === "Sonar Analyst" ? "btn-primary" : ""}`}
              onClick={() => setSelectedRoleFilter("Sonar Analyst")}
            >
              <AdminIcon name="activity" /> Sonar Analysts
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${selectedRoleFilter === "Supervisor / Manager" ? "btn-primary" : ""}`}
              onClick={() => setSelectedRoleFilter("Supervisor / Manager")}
            >
              <AdminIcon name="activity" /> Supervisors / Managers
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${selectedRoleFilter === "Marine Debris Removal Operator" ? "btn-primary" : ""}`}
              onClick={() => setSelectedRoleFilter("Marine Debris Removal Operator")}
            >
              <AdminIcon name="activity" /> Removal Operators
            </button>
            <button
              type="button"
              className={`btn-secondary btn-sm ${selectedRoleFilter === "System Administrator" ? "btn-primary" : ""}`}
              onClick={() => setSelectedRoleFilter("System Administrator")}
            >
              <AdminIcon name="settings" /> Administrators
            </button>
          </div>

          {/* Search & Add User */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by name, email, role..."
              className="admin-input"
              style={{ width: "240px" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreate}
            >
              <AdminIcon name="plus" /> Create User
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card" style={{ padding: "0" }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Permissions</th>
                <th>Last Active</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ color: "#ffffff", fontWeight: 600 }}>{getUserEmail(user)}</td>
                    <td>
                      <span className={`role-badge ${getRoleClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-pill ${user.status === "Active" ? "active" : "inactive"}`}
                        style={{ cursor: "pointer", border: "none" }}
                        onClick={() => handleToggleStatus(user)}
                        title="Click to toggle status"
                      >
                        <span className="status-dot" />
                        {user.status}
                      </button>
                    </td>
                    <td>
                      <div style={{ maxWidth: "260px" }}>
                        {user.permissions?.can_upload_sonar && <span className="perm-pill">Sonar Upload</span>}
                        {user.permissions?.can_run_ai && <span className="perm-pill">AI Detection</span>}
                        {user.permissions?.can_manage_users && <span className="perm-pill">Admin Access</span>}
                        {user.permissions?.can_dispatch_operators && <span className="perm-pill">Route Dispatch</span>}
                        {user.permissions?.can_export_reports && <span className="perm-pill">Export Reports</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                      {user.last_login && user.last_login !== "Never" ? (
                        (() => {
                          let str = String(user.last_login);
                          if (!str.endsWith("Z") && !str.includes("+") && !(str.length > 19 && str.slice(10).includes("-"))) {
                            str += "Z";
                          }
                          const d = new Date(str);
                          return isNaN(d.getTime()) ? user.last_login : d.toLocaleDateString();
                        })()
                      ) : "Never"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={async () => {
                            if (await showConfirm(`Are you sure you want to delete account for ${user.email || user.username}?`, "Delete user account")) {
                              onDeleteUser(user.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Edit User Account & Permissions" : "Create New User Account"}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <AdminIcon name="close" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. Dr. Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  className="admin-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. alex.morgan@marinedebris.gov"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="admin-input"
                    style={{ width: "100%" }}
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Assign Role</label>
                  <select
                    className="admin-select"
                    style={{ width: "100%" }}
                    value={formData.role}
                    onChange={(e) => handleRoleChangeInForm(e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Account Status</label>
                  <select
                    className="admin-select"
                    style={{ width: "100%" }}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Granular Access Permissions</label>
                <div className="checkbox-grid">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_upload_sonar)}
                      onChange={() => handleTogglePermission("can_upload_sonar")}
                    />
                    Upload Sonar Imagery
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_run_ai)}
                      onChange={() => handleTogglePermission("can_run_ai")}
                    />
                    Run AI Detection
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_export_reports)}
                      onChange={() => handleTogglePermission("can_export_reports")}
                    />
                    Export Reports & Data
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_dispatch_operators)}
                      onChange={() => handleTogglePermission("can_dispatch_operators")}
                    />
                    Dispatch Operators / Routes
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_manage_users)}
                      onChange={() => handleTogglePermission("can_manage_users")}
                    />
                    Manage Platform Users
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.permissions?.can_configure_system)}
                      onChange={() => handleTogglePermission("can_configure_system")}
                    />
                    Configure System Settings
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

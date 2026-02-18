import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import "./AdminPage.css";

export default function AdminPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("stats");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [mergeConflict, setMergeConflict] = useState(null);
    const [pendingUpload, setPendingUpload] = useState(null);
    const [resetModal, setResetModal] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmModal, setConfirmModal] = useState(null);
    const [userFilter, setUserFilter] = useState("all");
    const [createUserModal, setCreateUserModal] = useState(false);
    const [createForm, setCreateForm] = useState({ username: "", password: "", name: "", role: "user" });
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, subjectsRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get("/admin/users"),
                api.get("/subjects"),
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setSubjects(subjectsRes.data);
        } catch (err) {
            console.error("Admin fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const sanitizeJsonLatex = (text) => {
        return text.replace(/(\\\\)|(\\(?!["\\/bfnrtu]))/g, "\\\\");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const raw = await file.text();
            const text = sanitizeJsonLatex(raw);
            const data = JSON.parse(text);

            if (!data.subject || !data.questions) {
                setUploadStatus({ type: "error", message: "Invalid JSON: must contain 'subject' and 'questions'" });
                return;
            }

            const res = await api.post("/admin/subjects/upload", data);
            setUploadStatus({ type: "success", message: `${res.data.message}. Inserted: ${res.data.inserted}, Duplicates: ${res.data.duplicates}` });
            fetchData();
        } catch (err) {
            if (err.response?.data?.requiresMerge) {
                const raw = await file.text();
                const text = sanitizeJsonLatex(raw);
                const data = JSON.parse(text);
                setMergeConflict(err.response.data);
                setPendingUpload(data);
            } else {
                console.error("Upload error:", err.response?.status, err.response?.data || err.message);
                setUploadStatus({ type: "error", message: err.response?.data?.error || err.message || "Upload failed" });
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleMerge = async (merge) => {
        if (!pendingUpload) return;
        try {
            const res = await api.post("/admin/subjects/upload", { ...pendingUpload, merge });
            setUploadStatus({ type: "success", message: merge ? `Merged! Inserted: ${res.data.inserted}, Duplicates: ${res.data.duplicates}` : "Upload skipped." });
            fetchData();
        } catch (err) {
            setUploadStatus({ type: "error", message: err.response?.data?.error || "Operation failed" });
        }
        setMergeConflict(null);
        setPendingUpload(null);
    };

    const showConfirm = (title, message, action) => {
        setConfirmModal({ title, message, action });
    };

    const handleRoleChange = async (userId, newRole) => {
        showConfirm("Change Role", `Change this user's role to ${newRole}?`, async () => {
            try {
                await api.put(`/admin/users/${userId}/role`, { role: newRole });
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
            } catch (err) {
                alert(err.response?.data?.error || "Failed to update role");
            }
        });
    };

    const handleResetPassword = async () => {
        if (!resetModal || !newPassword) return;
        try {
            await api.put(`/admin/users/${resetModal.id}/reset-password`, { newPassword });
            setResetModal(null);
            setNewPassword("");
            alert("Password reset successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to reset password");
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        showConfirm("Delete Subject", "Delete this subject and all its questions? This cannot be undone.", async () => {
            try {
                await api.delete(`/admin/subjects/${subjectId}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.error || "Failed to delete subject");
            }
        });
    };

    const handleExportSubject = async (subjectId) => {
        try {
            const res = await api.get(`/admin/subjects/${subjectId}/export`);
            const data = res.data;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${data.subject.replace(/\s+/g, "_").toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Export failed");
        }
    };

    const handleDeleteUser = async (userId) => {
        showConfirm("Delete User", "Delete this user and all their data? This cannot be undone.", async () => {
            try {
                await api.delete(`/admin/users/${userId}`);
                setUsers((prev) => prev.filter((u) => u.id !== userId));
            } catch (err) {
                alert(err.response?.data?.error || "Failed to delete user");
            }
        });
    };

    const handleApproveToggle = async (userId, currentApproved) => {
        const action = currentApproved ? "revoke access for" : "approve";
        showConfirm(currentApproved ? "Revoke Access" : "Approve User", `Are you sure you want to ${action} this user?`, async () => {
            try {
                const res = await api.put(`/admin/users/${userId}/approve`);
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, approved: res.data.approved } : u)));
            } catch (err) {
                alert(err.response?.data?.error || "Failed to update approval");
            }
        });
    };

    const handleBanToggle = async (userId, currentBanned) => {
        const action = currentBanned ? "unban" : "ban";
        showConfirm(currentBanned ? "Unban User" : "Ban User", `Are you sure you want to ${action} this user?`, async () => {
            try {
                const res = await api.put(`/admin/users/${userId}/ban`);
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: res.data.banned } : u)));
            } catch (err) {
                alert(err.response?.data?.error || "Failed to update ban status");
            }
        });
    };

    const handleCreateUser = async () => {
        if (!createForm.username || !createForm.password || !createForm.name) return;
        try {
            const res = await api.post("/admin/users/create", createForm);
            setUsers((prev) => [...prev, res.data.user]);
            setCreateUserModal(false);
            setCreateForm({ username: "", password: "", name: "", role: "user" });
            alert("User created successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to create user");
        }
    };

    const getFilteredUsers = () => {
        switch (userFilter) {
            case "pending": return users.filter((u) => !u.approved);
            case "banned": return users.filter((u) => u.banned);
            case "admin": return users.filter((u) => u.role === "admin");
            default: return users;
        }
    };

    const filteredUsers = getFilteredUsers();
    const pendingCount = users.filter((u) => !u.approved).length;
    const bannedCount = users.filter((u) => u.banned).length;

    const tabs = [
        { id: "stats", icon: "bar_chart", label: "Overview" },
        { id: "users", icon: "group", label: "Users" },
        { id: "subjects", icon: "library_books", label: "Subjects" },
        { id: "upload", icon: "upload_file", label: "Upload" },
    ];

    return (
        <div className="admin-page">
            <div className="admin-header">
                <button className="admin-back-btn" onClick={() => navigate("/dashboard")}>
                    <span className="material-icons-outlined btn-icon">arrow_back</span>
                    Dashboard
                </button>
                <h1 className="admin-title">Admin Panel</h1>
                <div className="admin-user">
                    <span className="admin-badge">ADMIN</span>
                </div>
            </div>

            <div className="admin-tabs">
                {tabs.map((tab) => (
                    <button key={tab.id} className={`admin-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                        <span className="material-icons-outlined tab-icon">{tab.icon}</span>
                        {tab.label}
                        {tab.id === "users" && pendingCount > 0 && (
                            <span className="tab-badge">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="admin-content">
                {activeTab === "stats" && stats && (
                    <div className="stats-grid fade-in">
                        <div className="stat-card">
                            <span className="material-icons-outlined stat-card-icon">group</span>
                            <div className="stat-card-value">{stats.totalUsers}</div>
                            <div className="stat-card-label">Total Users</div>
                        </div>
                        <div className="stat-card">
                            <span className="material-icons-outlined stat-card-icon">library_books</span>
                            <div className="stat-card-value">{stats.totalSubjects}</div>
                            <div className="stat-card-label">Subjects</div>
                        </div>
                        <div className="stat-card">
                            <span className="material-icons-outlined stat-card-icon">help_outline</span>
                            <div className="stat-card-value">{stats.totalQuestions}</div>
                            <div className="stat-card-label">Questions</div>
                        </div>
                        <div className="stat-card">
                            <span className="material-icons-outlined stat-card-icon">quiz</span>
                            <div className="stat-card-value">{stats.totalQuizzes}</div>
                            <div className="stat-card-label">Quizzes Taken</div>
                        </div>
                        {stats.pendingUsers > 0 && (
                            <div className="stat-card warning" onClick={() => { setActiveTab("users"); setUserFilter("pending"); }}>
                                <span className="material-icons-outlined stat-card-icon">hourglass_top</span>
                                <div className="stat-card-value">{stats.pendingUsers}</div>
                                <div className="stat-card-label">Pending Approval</div>
                            </div>
                        )}
                        {stats.bannedUsers > 0 && (
                            <div className="stat-card danger" onClick={() => { setActiveTab("users"); setUserFilter("banned"); }}>
                                <span className="material-icons-outlined stat-card-icon">block</span>
                                <div className="stat-card-value">{stats.bannedUsers}</div>
                                <div className="stat-card-label">Banned Users</div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "users" && (
                    <div className="users-section fade-in">
                        <div className="users-toolbar">
                            <div className="user-filters">
                                {[
                                    { id: "all", label: "All", count: users.length },
                                    { id: "pending", label: "Pending", count: pendingCount },
                                    { id: "banned", label: "Banned", count: bannedCount },
                                    { id: "admin", label: "Admins", count: users.filter((u) => u.role === "admin").length },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        className={`user-filter-btn ${userFilter === f.id ? "active" : ""}`}
                                        onClick={() => setUserFilter(f.id)}
                                    >
                                        {f.label} ({f.count})
                                    </button>
                                ))}
                            </div>
                            <button className="create-user-btn" onClick={() => setCreateUserModal(true)}>
                                <span className="material-icons-outlined" style={{ fontSize: "18px" }}>person_add</span>
                                Create User
                            </button>
                        </div>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className={u.banned ? "banned-row" : !u.approved ? "pending-row" : ""}>
                                            <td>{u.name}</td>
                                            <td><code>{u.username}</code></td>
                                            <td>
                                                <span className={`role-badge ${u.role}`}>{u.role}</span>
                                            </td>
                                            <td>
                                                {u.banned ? (
                                                    <span className="status-chip banned">Banned</span>
                                                ) : u.approved ? (
                                                    <span className="status-chip approved">Approved</span>
                                                ) : (
                                                    <span className="status-chip pending">Pending</span>
                                                )}
                                            </td>
                                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className={`action-btn ${u.approved ? "" : "success"}`}
                                                    onClick={() => handleApproveToggle(u.id, u.approved)}
                                                    title={u.approved ? "Revoke Access" : "Approve"}
                                                >
                                                    <span className="material-icons-outlined">{u.approved ? "remove_circle_outline" : "check_circle"}</span>
                                                </button>
                                                {u.id !== user.id && (
                                                    <button
                                                        className={`action-btn ${u.banned ? "success" : "danger"}`}
                                                        onClick={() => handleBanToggle(u.id, u.banned)}
                                                        title={u.banned ? "Unban" : "Ban"}
                                                    >
                                                        <span className="material-icons-outlined">{u.banned ? "lock_open" : "block"}</span>
                                                    </button>
                                                )}
                                                <button className="action-btn" onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")} title={u.role === "admin" ? "Demote" : "Promote"}>
                                                    <span className="material-icons-outlined">{u.role === "admin" ? "arrow_downward" : "arrow_upward"}</span>
                                                </button>
                                                <button className="action-btn" onClick={() => setResetModal(u)} title="Reset Password">
                                                    <span className="material-icons-outlined">key</span>
                                                </button>
                                                {u.id !== user.id && (
                                                    <button className="action-btn danger" onClick={() => handleDeleteUser(u.id)} title="Delete">
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "subjects" && (
                    <div className="subjects-list fade-in">
                        {subjects.map((s) => (
                            <div key={s.id} className="admin-subject-card">
                                <div className="admin-subject-info">
                                    <h3>{s.name}</h3>
                                    <span>{s.question_count} questions · {s.module_count} modules</span>
                                </div>
                                <div className="admin-subject-actions">
                                    <button className="action-btn" onClick={() => handleExportSubject(s.id)} title="Export JSON">
                                        <span className="material-icons-outlined">download</span>
                                    </button>
                                    <button className="action-btn danger" onClick={() => handleDeleteSubject(s.id)} title="Delete">
                                        <span className="material-icons-outlined">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {subjects.length === 0 && <p className="empty-text">No subjects yet. Upload one!</p>}
                    </div>
                )}

                {activeTab === "upload" && (
                    <div className="upload-section fade-in">
                        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                            <span className="material-icons-outlined upload-icon">upload_file</span>
                            <h3>Upload Subject JSON</h3>
                            <p>Click to select a file or drag and drop</p>
                            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} style={{ display: "none" }} />
                        </div>
                        {uploadStatus && (
                            <div className={`upload-status ${uploadStatus.type}`}>
                                <span className="material-icons-outlined status-msg-icon">{uploadStatus.type === "success" ? "check_circle" : "error"}</span>
                                {uploadStatus.message}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {mergeConflict && (
                <div className="modal-overlay" onClick={() => { setMergeConflict(null); setPendingUpload(null); }}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            <span className="material-icons-outlined modal-title-icon">warning</span>
                            Subject Exists
                        </h2>
                        <p style={{ marginBottom: "1.5rem", color: "var(--md-on-surface-variant)" }}>This subject already exists. Would you like to merge the new questions?</p>
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => handleMerge(false)}>Skip</button>
                            <button className="modal-btn start" onClick={() => handleMerge(true)}>Merge Questions</button>
                        </div>
                    </div>
                </div>
            )}

            {resetModal && (
                <div className="modal-overlay" onClick={() => { setResetModal(null); setNewPassword(""); }}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Reset Password</h2>
                        <p style={{ marginBottom: "1rem", color: "var(--md-on-surface-variant)" }}>Reset password for <strong>{resetModal.username}</strong></p>
                        <div className="input-group">
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder=" " />
                            <label>New Password</label>
                            <div className="input-line" />
                        </div>
                        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                            <button className="modal-btn cancel" onClick={() => { setResetModal(null); setNewPassword(""); }}>Cancel</button>
                            <button className="modal-btn start" onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6}>Reset</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            <span className="material-icons-outlined modal-title-icon">warning</span>
                            {confirmModal.title}
                        </h2>
                        <p style={{ marginBottom: "1.5rem", color: "var(--md-on-surface-variant)" }}>{confirmModal.message}</p>
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
                            <button className="modal-btn start" onClick={() => { confirmModal.action(); setConfirmModal(null); }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {createUserModal && (
                <div className="modal-overlay" onClick={() => setCreateUserModal(false)}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Create User</h2>
                        <p style={{ marginBottom: "1rem", color: "var(--md-on-surface-variant)" }}>Create a new user account (auto-approved)</p>
                        <div className="input-group">
                            <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder=" " />
                            <label>Full Name</label>
                            <div className="input-line" />
                        </div>
                        <div className="input-group" style={{ marginTop: "1rem" }}>
                            <input type="text" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder=" " />
                            <label>Username</label>
                            <div className="input-line" />
                        </div>
                        <div className="input-group" style={{ marginTop: "1rem" }}>
                            <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder=" " />
                            <label>Password</label>
                            <div className="input-line" />
                        </div>
                        <div style={{ marginTop: "1rem" }}>
                            <label style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)", marginBottom: "0.5rem", display: "block" }}>Role</label>
                            <div className="timer-mode-selector">
                                <button
                                    className={`timer-mode-btn ${createForm.role === "user" ? "active" : ""}`}
                                    onClick={() => setCreateForm({ ...createForm, role: "user" })}
                                >
                                    User
                                </button>
                                <button
                                    className={`timer-mode-btn ${createForm.role === "admin" ? "active" : ""}`}
                                    onClick={() => setCreateForm({ ...createForm, role: "admin" })}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>
                        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                            <button className="modal-btn cancel" onClick={() => setCreateUserModal(false)}>Cancel</button>
                            <button
                                className="modal-btn start"
                                onClick={handleCreateUser}
                                disabled={!createForm.username || !createForm.password || !createForm.name || createForm.password.length < 6}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

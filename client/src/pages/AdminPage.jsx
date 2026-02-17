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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
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
                const text = await file.text();
                const data = JSON.parse(text);
                setMergeConflict(err.response.data);
                setPendingUpload(data);
            } else {
                setUploadStatus({ type: "error", message: err.response?.data?.error || "Upload failed" });
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

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update role");
        }
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
        if (!confirm("Delete this subject and all its questions?")) return;
        try {
            await api.delete(`/admin/subjects/${subjectId}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete subject");
        }
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
        if (!confirm("Delete this user and all their data?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete user");
        }
    };

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
                    </div>
                )}

                {activeTab === "users" && (
                    <div className="admin-table-container fade-in">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.name}</td>
                                        <td><code>{u.username}</code></td>
                                        <td>
                                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                                        </td>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="actions-cell">
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
        </div>
    );
}

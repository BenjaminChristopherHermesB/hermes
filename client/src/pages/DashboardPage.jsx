import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import api from "../services/api";
import "./DashboardPage.css";

export default function DashboardPage() {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quizSetup, setQuizSetup] = useState(null);
    const [questionCount, setQuestionCount] = useState(20);
    const [isTimed, setIsTimed] = useState(false);
    const [timePerQuestion, setTimePerQuestion] = useState(60);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await api.get("/subjects");
            setSubjects(res.data);
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async () => {
        if (!quizSetup) return;
        try {
            const res = await api.post("/quiz/start", {
                subjectId: quizSetup.id,
                questionCount,
                isTimed,
                timePerQuestion: isTimed ? timePerQuestion : null,
            });
            navigate(`/quiz/${quizSetup.id}`, { state: res.data });
        } catch (err) {
            alert(err.response?.data?.error || "Failed to start quiz");
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <img src="/logo.png" alt="Hermes" className="header-logo" />
                    <h1 className="header-brand">Hermes</h1>
                </div>
                <div className="header-right">
                    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                        <span className="material-icons-outlined">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
                    </button>
                    {user?.role === "admin" && (
                        <button className="header-btn admin-btn" onClick={() => navigate("/admin")}>
                            Admin
                        </button>
                    )}
                    <button className="header-btn logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <section className="greeting-section fade-in">
                    <h2 className="greeting">Hello, {user?.name}!</h2>
                    <p className="greeting-sub">Ready to challenge yourself today?</p>
                </section>

                {loading ? (
                    <div className="loading-container">
                        <div className="skeleton-grid">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton-card" />
                            ))}
                        </div>
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="empty-state fade-in">
                        <span className="material-icons-outlined empty-icon">menu_book</span>
                        <h3>No subjects yet</h3>
                        <p>Ask an admin to upload some quiz subjects!</p>
                    </div>
                ) : (
                    <section className="subjects-grid">
                        {subjects.map((subject, index) => (
                            <div
                                key={subject.id}
                                className="subject-card slide-up"
                                style={{ animationDelay: `${index * 0.08}s` }}
                                onClick={() => setQuizSetup(subject)}
                            >
                                <div className="subject-card-header">
                                    <span className="material-icons-outlined subject-icon">auto_stories</span>
                                    <div className="subject-modules">{subject.module_count} modules</div>
                                </div>
                                <h3 className="subject-name">{subject.name}</h3>
                                <div className="subject-stats">
                                    <div className="stat">
                                        <span className="stat-value">{subject.question_count}</span>
                                        <span className="stat-label">Questions</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">{subject.attempted}</span>
                                        <span className="stat-label">Attempted</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">{subject.mastered}</span>
                                        <span className="stat-label">Mastered</span>
                                    </div>
                                </div>
                                <div className="subject-progress-bar">
                                    <div
                                        className="subject-progress-fill"
                                        style={{ width: `${subject.question_count > 0 ? (subject.mastered / subject.question_count) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </main>

            {quizSetup && (
                <div className="modal-overlay" onClick={() => setQuizSetup(null)}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Start Quiz</h2>
                        <p className="modal-subtitle">{quizSetup.name}</p>

                        <div className="modal-field">
                            <label>Number of Questions: <strong>{questionCount}</strong></label>
                            <input
                                type="range"
                                min="10"
                                max={Math.min(100, quizSetup.question_count)}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                className="range-slider"
                            />
                            <div className="range-labels">
                                <span>10</span>
                                <span>{Math.min(100, quizSetup.question_count)}</span>
                            </div>
                        </div>

                        <div className="modal-field">
                            <label className="toggle-label" onClick={() => setIsTimed(!isTimed)}>
                                <div className={`toggle-switch ${isTimed ? "active" : ""}`}>
                                    <div className="toggle-thumb" />
                                </div>
                                <span>Timed Mode</span>
                            </label>
                        </div>

                        {isTimed && (
                            <div className="modal-field fade-in">
                                <label>Time per Question: <strong>{timePerQuestion}s</strong></label>
                                <input
                                    type="range"
                                    min="30"
                                    max="180"
                                    step="10"
                                    value={timePerQuestion}
                                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                                    className="range-slider"
                                />
                                <div className="range-labels">
                                    <span>30s</span>
                                    <span>3min</span>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setQuizSetup(null)}>Cancel</button>
                            <button className="modal-btn start" onClick={startQuiz}>Start Quiz</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

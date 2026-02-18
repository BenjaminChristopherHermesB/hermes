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
    const [timerMode, setTimerMode] = useState("per-question");
    const [timePerQuestion, setTimePerQuestion] = useState(60);
    const [minutesPerQuestion, setMinutesPerQuestion] = useState(1);
    const [showFeedback, setShowFeedback] = useState(true);
    const [wrongCounts, setWrongCounts] = useState({});
    const [quizMode, setQuizMode] = useState("normal");

    const isApproved = user?.approved !== false;

    useEffect(() => {
        if (isApproved) {
            fetchSubjects();
        } else {
            setLoading(false);
        }
    }, [isApproved]);

    const fetchSubjects = async () => {
        try {
            const res = await api.get("/subjects");
            setSubjects(res.data);
            const counts = {};
            for (const s of res.data) {
                try {
                    const wr = await api.get(`/quiz/wrong-count/${s.id}`);
                    counts[s.id] = wr.data.count;
                } catch { counts[s.id] = 0; }
            }
            setWrongCounts(counts);
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async () => {
        if (!quizSetup) return;
        try {
            const totalTime = timerMode === "block" ? Math.round(minutesPerQuestion * questionCount * 60) : null;
            const endpoint = quizMode === "wrong" ? "/quiz/start-wrong" : "/quiz/start";
            const payload = {
                subjectId: quizSetup.id,
                isTimed,
                timerMode: isTimed ? timerMode : null,
                timePerQuestion: isTimed && timerMode === "per-question" ? timePerQuestion : null,
                totalTime: isTimed && timerMode === "block" ? totalTime : null,
                showFeedback,
            };
            if (quizMode === "normal") payload.questionCount = questionCount;
            const res = await api.post(endpoint, payload);
            navigate(`/quiz/${quizSetup.id}`, { state: { ...res.data, showFeedback } });
        } catch (err) {
            alert(err.response?.data?.error || "Failed to start quiz");
        }
    };

    const openQuizModal = (subject, mode = "normal") => {
        setQuizMode(mode);
        setQuizSetup(subject);
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const totalBlockTime = Math.round(minutesPerQuestion * questionCount);

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

                {!isApproved ? (
                    <div className="pending-banner fade-in">
                        <span className="material-icons-outlined pending-icon">hourglass_top</span>
                        <div className="pending-content">
                            <h3>Account Pending Approval</h3>
                            <p>Your account is awaiting admin approval. You'll be able to access quizzes once an admin approves your account.</p>
                        </div>
                    </div>
                ) : loading ? (
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
                            >
                                <div className="subject-card-header" onClick={() => openQuizModal(subject)}>
                                    <span className="material-icons-outlined subject-icon">auto_stories</span>
                                    <div className="subject-modules">{subject.module_count} modules</div>
                                </div>
                                <h3 className="subject-name" onClick={() => openQuizModal(subject)}>{subject.name}</h3>
                                <div className="subject-stats" onClick={() => openQuizModal(subject)}>
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
                                <div className="subject-progress-bar" onClick={() => openQuizModal(subject)}>
                                    <div
                                        className="subject-progress-fill"
                                        style={{ width: `${subject.question_count > 0 ? (subject.mastered / subject.question_count) * 100 : 0}%` }}
                                    />
                                </div>
                                {wrongCounts[subject.id] > 0 && (
                                    <button
                                        className="practice-mistakes-btn"
                                        onClick={(e) => { e.stopPropagation(); openQuizModal(subject, "wrong"); }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: "16px" }}>replay</span>
                                        Practice Mistakes ({wrongCounts[subject.id]})
                                    </button>
                                )}
                            </div>
                        ))}
                    </section>
                )}
            </main>

            {quizSetup && (
                <div className="modal-overlay" onClick={() => setQuizSetup(null)}>
                    <div className="modal scale-in" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            {quizMode === "wrong" ? "Practice Mistakes" : "Start Quiz"}
                        </h2>
                        <p className="modal-subtitle">{quizSetup.name}</p>

                        {quizMode === "wrong" ? (
                            <div className="modal-field">
                                <p style={{ color: "var(--md-on-surface-variant)", fontSize: "0.875rem" }}>
                                    <span className="material-icons-outlined" style={{ fontSize: "16px", verticalAlign: "middle", marginRight: "0.375rem" }}>replay</span>
                                    You have <strong style={{ color: "var(--md-primary)" }}>{wrongCounts[quizSetup.id]}</strong> questions to retry.
                                </p>
                            </div>
                        ) : (
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
                        )}

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
                                <div className="timer-mode-selector">
                                    <button
                                        className={`timer-mode-btn ${timerMode === "per-question" ? "active" : ""}`}
                                        onClick={() => setTimerMode("per-question")}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: "18px" }}>timer</span>
                                        Per Question
                                    </button>
                                    <button
                                        className={`timer-mode-btn ${timerMode === "block" ? "active" : ""}`}
                                        onClick={() => setTimerMode("block")}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: "18px" }}>hourglass_top</span>
                                        Block Timer
                                    </button>
                                </div>

                                {timerMode === "per-question" ? (
                                    <div className="timer-config fade-in">
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
                                ) : (
                                    <div className="timer-config fade-in">
                                        <label>Time per Question: <strong>{minutesPerQuestion} min</strong></label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="3"
                                            step="0.5"
                                            value={minutesPerQuestion}
                                            onChange={(e) => setMinutesPerQuestion(parseFloat(e.target.value))}
                                            className="range-slider"
                                        />
                                        <div className="range-labels">
                                            <span>0.5 min</span>
                                            <span>3 min</span>
                                        </div>
                                        <div className="block-timer-summary">
                                            <span className="material-icons-outlined" style={{ fontSize: "16px" }}>schedule</span>
                                            Total: <strong>{totalBlockTime} min</strong> for {quizMode === "wrong" ? wrongCounts[quizSetup.id] : questionCount} questions
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="modal-field">
                            <label className="toggle-label" onClick={() => setShowFeedback(!showFeedback)}>
                                <div className={`toggle-switch ${showFeedback ? "active" : ""}`}>
                                    <div className="toggle-thumb" />
                                </div>
                                <span>Immediate Feedback</span>
                            </label>
                            <p className="toggle-hint">{showFeedback ? "Show correct answer after each question" : "See all results at the end"}</p>
                        </div>

                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setQuizSetup(null)}>Cancel</button>
                            <button className="modal-btn start" onClick={startQuiz}>
                                {quizMode === "wrong" ? "Practice" : "Start Quiz"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

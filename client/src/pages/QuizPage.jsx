import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Latex from "../components/Latex";
import "./QuizPage.css";

export default function QuizPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { subjectId } = useParams();
    const [sessionData, setSessionData] = useState(location.state || null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [feedbackMap, setFeedbackMap] = useState({});
    const [flagged, setFlagged] = useState(new Set());
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showTimeUpModal, setShowTimeUpModal] = useState(false);
    const timerRef = useRef(null);
    const timeUpProcessedRef = useRef(false);

    const showFeedback = sessionData?.showFeedback !== false;
    const isBlockTimer = sessionData?.timerMode === "block";
    const isPerQuestionTimer = sessionData?.isTimed && !isBlockTimer;

    useEffect(() => {
        if (!sessionData) {
            navigate("/dashboard");
        }
    }, [sessionData, navigate]);

    useEffect(() => {
        if (!sessionData?.isTimed || completed) return;

        if (isBlockTimer && sessionData.totalTime) {
            setTimeLeft(sessionData.totalTime);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        if (!timeUpProcessedRef.current) {
                            timeUpProcessedRef.current = true;
                            setShowTimeUpModal(true);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [sessionData, completed, isBlockTimer]);

    useEffect(() => {
        if (!isPerQuestionTimer || completed || feedbackMap[currentIndex]) return;

        setTimeLeft(sessionData.timePerQuestion);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    submitAnswer(currentIndex, null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [currentIndex, completed, sessionData, isPerQuestionTimer]);

    const submitAnswer = useCallback(async (qIndex, answer) => {
        if (submitting) return;
        const q = sessionData.questions[qIndex];
        if (showFeedback && feedbackMap[qIndex]) return;

        setSubmitting(true);
        if (isPerQuestionTimer) clearInterval(timerRef.current);

        try {
            const res = await api.post("/quiz/submit", {
                sessionId: sessionData.sessionId,
                questionId: q.id,
                selectedAnswer: answer,
                showFeedback,
            });

            setSelectedAnswers((prev) => ({ ...prev, [qIndex]: answer }));

            if (showFeedback) {
                setFeedbackMap((prev) => ({ ...prev, [qIndex]: res.data }));
                if (res.data.isCorrect) setScore((p) => p + 1);
            }
        } catch (err) {
            console.error("Submit error:", err);
        } finally {
            setSubmitting(false);
        }
    }, [sessionData, submitting, feedbackMap, showFeedback, isPerQuestionTimer]);

    const handleOptionClick = (option) => {
        if (showFeedback && feedbackMap[currentIndex]) return;
        setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    };

    const handleSubmitClick = () => {
        const answer = selectedAnswers[currentIndex];
        if (answer === undefined || answer === null) return;
        submitAnswer(currentIndex, answer);
    };

    const handleNext = () => {
        if (currentIndex < sessionData.questions.length - 1) {
            setCurrentIndex((p) => p + 1);
        } else if (showFeedback) {
            completeQuiz();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex((p) => p - 1);
    };

    const jumpToQuestion = (idx) => {
        if (showFeedback && feedbackMap[idx] && idx !== currentIndex) return;
        setCurrentIndex(idx);
        setSidebarOpen(false);
    };

    const toggleFlag = () => {
        setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(currentIndex)) next.delete(currentIndex);
            else next.add(currentIndex);
            return next;
        });
    };

    const handleTimeUpConfirm = async () => {
        setShowTimeUpModal(false);
        await submitAllAndComplete();
    };

    const submitAllAndComplete = async () => {
        if (!sessionData) return;
        for (let i = 0; i < sessionData.questions.length; i++) {
            if (!feedbackMap[i] && selectedAnswers[i] === undefined) {
                try {
                    await api.post("/quiz/submit", {
                        sessionId: sessionData.sessionId,
                        questionId: sessionData.questions[i].id,
                        selectedAnswer: null,
                        showFeedback: false,
                    });
                } catch (err) {
                    console.error("Auto-submit error:", err);
                }
            } else if (!showFeedback && selectedAnswers[i] !== undefined && !feedbackMap[i]) {
                try {
                    await api.post("/quiz/submit", {
                        sessionId: sessionData.sessionId,
                        questionId: sessionData.questions[i].id,
                        selectedAnswer: selectedAnswers[i],
                        showFeedback: false,
                    });
                } catch (err) {
                    console.error("Auto-submit error:", err);
                }
            }
        }
        await completeQuiz();
    };

    const handleFinishQuiz = () => {
        if (isBlockTimer) clearInterval(timerRef.current);
        submitAllAndComplete();
    };

    const completeQuiz = async () => {
        try {
            const res = await api.post("/quiz/complete", { sessionId: sessionData.sessionId });
            setResults(res.data);
            setCompleted(true);
        } catch (err) {
            console.error("Complete error:", err);
            setCompleted(true);
        }
    };

    const formatTime = (seconds) => {
        if (seconds === null) return "";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const getQuestionStatus = (idx) => {
        if (showFeedback && feedbackMap[idx]) {
            return feedbackMap[idx].isCorrect ? "correct" : "wrong";
        }
        if (selectedAnswers[idx] !== undefined) return "answered";
        if (flagged.has(idx)) return "flagged";
        return "unanswered";
    };

    const getStatusTooltip = (idx) => {
        const status = getQuestionStatus(idx);
        if (status === "correct") return "Correct";
        if (status === "wrong") return "Incorrect";
        if (status === "answered") return "Answered";
        if (status === "flagged") return "Flagged for review";
        return "Not answered";
    };

    if (!sessionData) return null;

    const question = sessionData.questions[currentIndex];
    const answeredCount = showFeedback ? Object.keys(feedbackMap).length : Object.keys(selectedAnswers).length;
    const progress = (answeredCount / sessionData.totalQuestions) * 100;
    const currentFeedback = feedbackMap[currentIndex];
    const currentSelected = selectedAnswers[currentIndex];
    const isLocked = showFeedback && !!currentFeedback;

    if (completed) {
        const scoreVal = results?.score || 0;
        let resultLabel = "Keep Practicing";
        let resultIcon = "fitness_center";
        if (scoreVal >= 70) { resultLabel = "Excellent Work"; resultIcon = "emoji_events"; }
        else if (scoreVal >= 40) { resultLabel = "Good Effort"; resultIcon = "thumb_up"; }

        return (
            <div className="quiz-page">
                <div className="quiz-results scale-in">
                    <span className="material-icons-outlined results-icon">{resultIcon}</span>
                    <h1 className="results-title">Quiz Complete!</h1>
                    <p className="results-label">{resultLabel}</p>
                    <div className="results-score-ring">
                        <svg viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--md-outline-variant)" strokeWidth="8" />
                            <circle
                                cx="60" cy="60" r="54" fill="none"
                                stroke={scoreVal >= 70 ? "var(--md-success)" : scoreVal >= 40 ? "var(--md-warning)" : "var(--md-error)"}
                                strokeWidth="8"
                                strokeDasharray={`${scoreVal * 3.39} 339.292`}
                                strokeLinecap="round"
                                transform="rotate(-90 60 60)"
                                className="score-circle"
                            />
                        </svg>
                        <div className="score-text">{scoreVal}%</div>
                    </div>
                    <div className="results-stats">
                        <div className="result-stat">
                            <span className="result-stat-value">{results?.correctCount || score}</span>
                            <span className="result-stat-label">Correct</span>
                        </div>
                        <div className="result-stat">
                            <span className="result-stat-value">{results?.totalQuestions || sessionData.totalQuestions}</span>
                            <span className="result-stat-label">Total</span>
                        </div>
                    </div>
                    <div className="results-actions">
                        <button className="results-btn review" onClick={() => navigate(`/quiz/review/${sessionData.sessionId}`)}>
                            <span className="material-icons-outlined btn-icon">rate_review</span>
                            Review Answers
                        </button>
                        <button className="results-btn home" onClick={() => navigate("/dashboard")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="quiz-page">
            <div className="quiz-header">
                <div className="quiz-header-left">
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <span className="material-icons-outlined">{sidebarOpen ? "close" : "grid_view"}</span>
                    </button>
                    <button className="quiz-back-btn" onClick={() => { if (confirm("Leave this quiz? Your progress will be saved.")) navigate("/dashboard"); }}>
                        <span className="material-icons-outlined btn-icon">arrow_back</span>
                        Exit
                    </button>
                </div>
                <div className="quiz-info">
                    <span className="quiz-counter">{currentIndex + 1} / {sessionData.totalQuestions}</span>
                    {sessionData.isTimed && timeLeft !== null && (
                        <span className={`quiz-timer ${timeLeft <= 30 && isBlockTimer ? "warning" : ""} ${timeLeft <= 10 && isPerQuestionTimer ? "warning" : ""}`}>
                            <span className="material-icons-outlined timer-icon">timer</span>
                            {isBlockTimer ? formatTime(timeLeft) : `${timeLeft}s`}
                        </span>
                    )}
                </div>
                <div className="quiz-header-right">
                    {!showFeedback && (
                        <button className="finish-quiz-btn" onClick={handleFinishQuiz}>
                            <span className="material-icons-outlined btn-icon">flag</span>
                            Finish
                        </button>
                    )}
                    <div className="quiz-score">Score: {showFeedback ? score : `${answeredCount}/${sessionData.totalQuestions}`}</div>
                </div>
            </div>

            <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="quiz-body">
                <aside className={`quiz-sidebar ${sidebarOpen ? "open" : ""}`}>
                    <div className="sidebar-header">
                        <h3>Questions</h3>
                        <div className="sidebar-legend">
                            <span className="legend-item"><span className="legend-dot answered" /> Answered</span>
                            <span className="legend-item"><span className="legend-dot flagged" /> Flagged</span>
                            {showFeedback && (
                                <>
                                    <span className="legend-item"><span className="legend-dot correct" /> Correct</span>
                                    <span className="legend-item"><span className="legend-dot wrong" /> Wrong</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="sidebar-grid">
                        {sessionData.questions.map((_, idx) => {
                            const status = getQuestionStatus(idx);
                            return (
                                <button
                                    key={idx}
                                    className={`sidebar-q-btn ${status} ${idx === currentIndex ? "current" : ""} ${flagged.has(idx) ? "flag-marker" : ""}`}
                                    onClick={() => jumpToQuestion(idx)}
                                    title={getStatusTooltip(idx)}
                                >
                                    {idx + 1}
                                    {flagged.has(idx) && <span className="flag-dot" />}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className="quiz-content">
                    <div className="quiz-question-card fade-in" key={currentIndex}>
                        <div className="question-top-row">
                            <div className="question-module">Module {question.module}</div>
                            <button className={`flag-btn ${flagged.has(currentIndex) ? "active" : ""}`} onClick={toggleFlag} title="Mark for review">
                                <span className="material-icons-outlined">{flagged.has(currentIndex) ? "bookmark" : "bookmark_border"}</span>
                            </button>
                        </div>
                        <h2 className="question-text"><Latex>{question.question}</Latex></h2>

                        <div className="options-grid">
                            {question.options.map((option, idx) => {
                                let optionClass = "option-btn";
                                if (isLocked) {
                                    if (option === currentFeedback.correctAnswer) optionClass += " correct";
                                    else if (option === currentSelected && !currentFeedback.isCorrect) optionClass += " wrong";
                                    else optionClass += " disabled";
                                } else if (option === currentSelected) {
                                    optionClass += " selected";
                                }

                                return (
                                    <button
                                        key={idx}
                                        className={optionClass}
                                        onClick={() => handleOptionClick(option)}
                                        disabled={isLocked}
                                    >
                                        <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                                        <span className="option-text"><Latex>{option}</Latex></span>
                                    </button>
                                );
                            })}
                        </div>

                        {!isLocked && currentSelected !== undefined && showFeedback && (
                            <button className="submit-btn fade-in" onClick={handleSubmitClick} disabled={submitting}>
                                {submitting ? <span className="btn-spinner" /> : "Submit Answer"}
                            </button>
                        )}

                        {isLocked && currentFeedback && (
                            <div className={`feedback-card ${currentFeedback.isCorrect ? "correct" : "wrong"} fade-in`}>
                                <span className="material-icons-outlined feedback-icon">{currentFeedback.isCorrect ? "check_circle" : "cancel"}</span>
                                <div className="feedback-content">
                                    <strong>{currentFeedback.isCorrect ? "Correct!" : "Incorrect"}</strong>
                                    {!currentFeedback.isCorrect && <p>Correct answer: <strong><Latex>{currentFeedback.correctAnswer}</Latex></strong></p>}
                                    {currentFeedback.explanation && <p className="feedback-explanation"><Latex>{currentFeedback.explanation}</Latex></p>}
                                </div>
                            </div>
                        )}

                        <div className="question-nav">
                            <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
                                <span className="material-icons-outlined">arrow_back</span>
                                Previous
                            </button>

                            {showFeedback && isLocked && (
                                <button className="nav-btn primary" onClick={handleNext}>
                                    {currentIndex < sessionData.questions.length - 1 ? "Next Question" : "Finish Quiz"}
                                    <span className="material-icons-outlined">{currentIndex < sessionData.questions.length - 1 ? "arrow_forward" : "flag"}</span>
                                </button>
                            )}

                            {!showFeedback && (
                                <button className="nav-btn primary" onClick={handleNext} disabled={currentIndex >= sessionData.questions.length - 1}>
                                    Next Question
                                    <span className="material-icons-outlined">arrow_forward</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showTimeUpModal && (
                <div className="modal-overlay">
                    <div className="time-up-modal scale-in">
                        <span className="material-icons-outlined time-up-icon">alarm</span>
                        <h2>Time is up!</h2>
                        <p>Submitting your quiz...</p>
                        <button className="time-up-btn" onClick={handleTimeUpConfirm}>
                            View Results
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./QuizPage.css";

export default function QuizPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { subjectId } = useParams();
    const [sessionData, setSessionData] = useState(location.state || null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [score, setScore] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!sessionData) {
            navigate("/dashboard");
        }
    }, [sessionData, navigate]);

    useEffect(() => {
        if (sessionData?.isTimed && sessionData?.timePerQuestion && !feedback && !completed) {
            setTimeLeft(sessionData.timePerQuestion);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitAnswer(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [currentIndex, feedback, completed, sessionData]);

    const handleSubmitAnswer = useCallback(async (answer) => {
        if (submitting || feedback) return;
        setSubmitting(true);
        clearInterval(timerRef.current);

        try {
            const res = await api.post("/quiz/submit", {
                sessionId: sessionData.sessionId,
                questionId: sessionData.questions[currentIndex].id,
                selectedAnswer: answer,
            });

            setFeedback(res.data);
            setSelectedAnswer(answer);
            setAnsweredCount((p) => p + 1);
            if (res.data.isCorrect) setScore((p) => p + 1);
        } catch (err) {
            console.error("Submit error:", err);
        } finally {
            setSubmitting(false);
        }
    }, [currentIndex, sessionData, submitting, feedback]);

    const handleNext = () => {
        if (currentIndex < sessionData.questions.length - 1) {
            setCurrentIndex((p) => p + 1);
            setSelectedAnswer(null);
            setFeedback(null);
        } else {
            completeQuiz();
        }
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

    if (!sessionData) return null;

    const question = sessionData.questions[currentIndex];
    const progress = ((currentIndex + (feedback ? 1 : 0)) / sessionData.totalQuestions) * 100;

    if (completed) {
        return (
            <div className="quiz-page">
                <div className="quiz-results scale-in">
                    <div className="results-icon">{results?.score >= 70 ? "🎉" : results?.score >= 40 ? "👍" : "💪"}</div>
                    <h1 className="results-title">Quiz Complete!</h1>
                    <div className="results-score-ring">
                        <svg viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--md-outline-variant)" strokeWidth="8" />
                            <circle
                                cx="60" cy="60" r="54" fill="none"
                                stroke={results?.score >= 70 ? "var(--md-success)" : results?.score >= 40 ? "var(--md-warning)" : "var(--md-error)"}
                                strokeWidth="8"
                                strokeDasharray={`${(results?.score || 0) * 3.39} 339.292`}
                                strokeLinecap="round"
                                transform="rotate(-90 60 60)"
                                className="score-circle"
                            />
                        </svg>
                        <div className="score-text">{results?.score || 0}%</div>
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
                            Review Answers 📝
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
                <button className="quiz-back-btn" onClick={() => { if (confirm("Leave this quiz? Your progress will be saved.")) navigate("/dashboard"); }}>
                    ← Exit
                </button>
                <div className="quiz-info">
                    <span className="quiz-counter">{currentIndex + 1} / {sessionData.totalQuestions}</span>
                    {sessionData.isTimed && timeLeft !== null && (
                        <span className={`quiz-timer ${timeLeft <= 10 ? "warning" : ""}`}>
                            ⏱ {timeLeft}s
                        </span>
                    )}
                </div>
                <div className="quiz-score">Score: {score}</div>
            </div>

            <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="quiz-content">
                <div className="quiz-question-card fade-in" key={currentIndex}>
                    <div className="question-module">Module {question.module}</div>
                    <h2 className="question-text">{question.question}</h2>

                    <div className="options-grid">
                        {question.options.map((option, idx) => {
                            let optionClass = "option-btn";
                            if (feedback) {
                                if (option === feedback.correctAnswer) optionClass += " correct";
                                else if (option === selectedAnswer && !feedback.isCorrect) optionClass += " wrong";
                                else optionClass += " disabled";
                            } else if (option === selectedAnswer) {
                                optionClass += " selected";
                            }

                            return (
                                <button
                                    key={idx}
                                    className={optionClass}
                                    onClick={() => !feedback && handleSubmitAnswer(option)}
                                    disabled={!!feedback}
                                >
                                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                                    <span className="option-text">{option}</span>
                                </button>
                            );
                        })}
                    </div>

                    {feedback && (
                        <div className={`feedback-card ${feedback.isCorrect ? "correct" : "wrong"} fade-in`}>
                            <div className="feedback-icon">{feedback.isCorrect ? "✅" : "❌"}</div>
                            <div className="feedback-content">
                                <strong>{feedback.isCorrect ? "Correct!" : "Incorrect"}</strong>
                                {!feedback.isCorrect && <p>Correct answer: <strong>{feedback.correctAnswer}</strong></p>}
                                {feedback.explanation && <p className="feedback-explanation">{feedback.explanation}</p>}
                            </div>
                        </div>
                    )}

                    {feedback && (
                        <button className="next-btn fade-in" onClick={handleNext}>
                            {currentIndex < sessionData.questions.length - 1 ? "Next Question →" : "Finish Quiz 🏁"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

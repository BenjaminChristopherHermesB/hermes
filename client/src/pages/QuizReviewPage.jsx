import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./QuizReviewPage.css";

export default function QuizReviewPage() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [reviewData, setReviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchReview();
    }, [sessionId]);

    const fetchReview = async () => {
        try {
            const res = await api.get(`/quiz/review/${sessionId}`);
            setReviewData(res.data);
        } catch (err) {
            console.error("Failed to fetch review:", err);
            navigate("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="review-page">
                <div className="review-loading">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (!reviewData) return null;

    const { session, answers } = reviewData;
    const filtered = filter === "all" ? answers : filter === "correct" ? answers.filter((a) => a.is_correct) : answers.filter((a) => !a.is_correct);
    const score = Math.round((session.correct_count / session.total_questions) * 100);

    return (
        <div className="review-page">
            <div className="review-header">
                <button className="review-back-btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
                <h1 className="review-title">Quiz Review</h1>
                <div className="review-score-badge" style={{ background: score >= 70 ? "var(--md-success)" : score >= 40 ? "var(--md-warning)" : "var(--md-error)" }}>
                    {score}%
                </div>
            </div>

            <div className="review-filters">
                <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                    All ({answers.length})
                </button>
                <button className={`filter-btn ${filter === "correct" ? "active" : ""}`} onClick={() => setFilter("correct")}>
                    ✅ Correct ({answers.filter((a) => a.is_correct).length})
                </button>
                <button className={`filter-btn ${filter === "wrong" ? "active" : ""}`} onClick={() => setFilter("wrong")}>
                    ❌ Wrong ({answers.filter((a) => !a.is_correct).length})
                </button>
            </div>

            <div className="review-questions">
                {filtered.map((answer, idx) => (
                    <div key={answer.id} className={`review-card ${answer.is_correct ? "correct" : "wrong"} fade-in`} style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="review-card-header">
                            <span className="review-q-number">Q{answers.indexOf(answer) + 1}</span>
                            <span className="review-module-badge">Module {answer.module}</span>
                            <span className={`review-status ${answer.is_correct ? "correct" : "wrong"}`}>
                                {answer.is_correct ? "✅ Correct" : "❌ Wrong"}
                            </span>
                        </div>
                        <p className="review-question-text">{answer.question}</p>
                        <div className="review-options">
                            {answer.options.map((opt, optIdx) => (
                                <div
                                    key={optIdx}
                                    className={`review-option ${opt === answer.correct_answer ? "correct-answer" : ""} ${opt === answer.selected_answer && !answer.is_correct ? "wrong-answer" : ""}`}
                                >
                                    <span className="review-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                    <span>{opt}</span>
                                    {opt === answer.correct_answer && <span className="review-opt-badge correct">✓</span>}
                                    {opt === answer.selected_answer && opt !== answer.correct_answer && <span className="review-opt-badge wrong">✗</span>}
                                </div>
                            ))}
                        </div>
                        {answer.explanation && (
                            <div className="review-explanation">
                                <strong>💡 Explanation:</strong> {answer.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

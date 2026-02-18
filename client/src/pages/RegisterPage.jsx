import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./AuthPages.css";

export default function RegisterPage() {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const userData = await register(username, password, name);
            if (userData.approved) {
                navigate("/dashboard");
            } else {
                setPendingApproval(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-shapes">
                <div className="shape shape-1" />
                <div className="shape shape-2" />
                <div className="shape shape-3" />
            </div>
            {pendingApproval ? (
                <div className="auth-card slide-up">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="Hermes The Quizzer" className="auth-logo-img" />
                    </div>
                    <h1 className="auth-title">Account Created!</h1>
                    <div style={{ textAlign: "center", padding: "1rem 0" }}>
                        <span className="material-icons-outlined" style={{ fontSize: "48px", color: "var(--md-primary)", marginBottom: "1rem", display: "block" }}>hourglass_top</span>
                        <p style={{ color: "var(--md-on-surface-variant)", marginBottom: "1rem", lineHeight: 1.5 }}>
                            Your account is awaiting admin approval. You'll be able to access quizzes once an admin approves your account.
                        </p>
                        <Link to="/login" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}>Go to Login</Link>
                    </div>
                </div>
            ) : (
                <div className="auth-card slide-up">
                    <div className="auth-logo">
                        <img src="/logo.png" alt="Hermes The Quizzer" className="auth-logo-img" />
                    </div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join Hermes and start quizzing</p>
                    {error && <div className="auth-error">{error}</div>}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <input
                                id="register-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="register-name">Full Name</label>
                            <div className="input-line" />
                        </div>
                        <div className="input-group">
                            <input
                                id="register-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder=" "
                                required
                                autoComplete="username"
                            />
                            <label htmlFor="register-username">Username</label>
                            <div className="input-line" />
                        </div>
                        <div className="input-group">
                            <input
                                id="register-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=" "
                                required
                                autoComplete="new-password"
                            />
                            <label htmlFor="register-password">Password</label>
                            <div className="input-line" />
                        </div>
                        <div className="input-group">
                            <input
                                id="register-confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder=" "
                                required
                                autoComplete="new-password"
                            />
                            <label htmlFor="register-confirm">Confirm Password</label>
                            <div className="input-line" />
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? <span className="btn-spinner" /> : "Create Account"}
                        </button>
                    </form>
                    <p className="auth-footer">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            )}
        </div>
    );
}

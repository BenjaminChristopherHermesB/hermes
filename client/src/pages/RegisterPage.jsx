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
            await register(username, password, name);
            navigate("/dashboard");
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
        </div>
    );
}

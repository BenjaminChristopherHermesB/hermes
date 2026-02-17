import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./AuthPages.css";

export default function LoginPage() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [stayLoggedIn, setStayLoggedIn] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password, stayLoggedIn);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Login failed. Please try again.");
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
                    <img src="/logo.svg" alt="Hermes The Quizzer" className="auth-logo-img" />
                </div>
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to continue your journey</p>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder=" "
                            required
                            autoComplete="username"
                        />
                        <label htmlFor="login-username">Username</label>
                        <div className="input-line" />
                    </div>
                    <div className="input-group">
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=" "
                            required
                            autoComplete="current-password"
                        />
                        <label htmlFor="login-password">Password</label>
                        <div className="input-line" />
                    </div>
                    <div className="auth-toggle-row">
                        <label className="toggle-label" htmlFor="stay-logged-in">
                            <div className={`toggle-switch ${stayLoggedIn ? "active" : ""}`} onClick={() => setStayLoggedIn(!stayLoggedIn)}>
                                <div className="toggle-thumb" />
                            </div>
                            <span>Stay logged in</span>
                        </label>
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? <span className="btn-spinner" /> : "Sign In"}
                    </button>
                </form>
                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}

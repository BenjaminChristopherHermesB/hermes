import { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        const saved = localStorage.getItem("theme");
        return saved || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            try {
                api.put("/user/theme", { theme: next }).catch(() => { });
            } catch (e) { }
            return next;
        });
    }, []);

    const setTheme = useCallback((t) => {
        setThemeState(t);
        try {
            api.put("/user/theme", { theme: t }).catch(() => { });
        } catch (e) { }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

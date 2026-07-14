"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./showroom.module.css";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("veyra-theme") as Theme | null;
    const initial = saved === "light" ? "light" : "dark";
    document.documentElement.dataset.demoTheme = initial;
    const frame = window.requestAnimationFrame(() => setTheme(initial));
    return () => {
      window.cancelAnimationFrame(frame);
      delete document.documentElement.dataset.demoTheme;
    };
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.demoTheme = next;
    window.localStorage.setItem("veyra-theme", next);
  };

  return (
    <button className={styles.themeToggle} type="button" onClick={toggle} aria-label={`Activer le thème ${theme === "dark" ? "clair" : "sombre"}`}>
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

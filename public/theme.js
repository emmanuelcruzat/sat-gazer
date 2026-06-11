const THEME_KEY = "satgazer-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "☾ Dark Mode" : "☀ Light Mode";
  window.dispatchEvent(new CustomEvent("satgazer-theme-change", { detail: theme }));
}

// Sync button label — the inline <head> script already set the attribute to avoid a flash
applyTheme(document.documentElement.getAttribute("data-theme") || "dark");

const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

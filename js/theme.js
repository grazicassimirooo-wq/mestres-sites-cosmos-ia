(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem("cosmos-theme");
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    const icon = toggle.querySelector(".theme-icon");

    const isDark = () => {
      const attr = root.getAttribute("data-theme");
      if (attr === "dark") return true;
      if (attr === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const syncIcon = () => {
      icon.textContent = isDark() ? "☀️" : "🌙";
    };
    syncIcon();

    toggle.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("cosmos-theme", next);
      syncIcon();
    });
  });
})();

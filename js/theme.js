(function () {
  const root = document.documentElement;
  const KEY = "cosmos-theme";

  function readStored() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  function writeStored(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage bloqueado: o tema vale só nesta visita */
    }
  }

  const stored = readStored();
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    const icon = toggle && toggle.querySelector(".theme-icon");
    if (!toggle || !icon) return;

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
      writeStored(next);
      syncIcon();
    });
  });
})();

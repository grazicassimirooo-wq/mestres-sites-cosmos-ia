(function () {
  const config = window.COSMOS_CONFIG || {};
  const newToolUrl = config.repoUrl
    ? `${config.repoUrl}/issues/new?template=nova-ferramenta.yml`
    : "#";

  function deleteToolUrl(tool) {
    if (!config.repoUrl) return "#";
    const params = new URLSearchParams({
      template: "excluir-ferramenta.yml",
      title: `[Excluir ferramenta] ${tool.name}`,
      link: tool.link || "",
      motivo: "",
    });
    return `${config.repoUrl}/issues/new?${params.toString()}`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#new-tool-link, #new-tool-link-hero").forEach((el) => {
      el.href = newToolUrl;
    });

    initViewToggle();
    initCatalogo();
  });

  const supportsHoverTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function attachTilt(card) {
    if (!supportsHoverTilt) return;

    function handleMove(event) {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const isWide = rect.width > rect.height * 2.2;
      const maxTilt = isWide ? 2 : 8;
      const ry = (px - 0.5) * maxTilt * 2;
      const rx = (0.5 - py) * maxTilt * 2;
      card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    }

    function reset() {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }

    card.addEventListener("pointermove", handleMove);
    card.addEventListener("pointerleave", reset);
  }

  function initViewToggle() {
    const grid = document.getElementById("tools-grid");
    const gridBtn = document.getElementById("view-grid-btn");
    const listBtn = document.getElementById("view-list-btn");
    if (!grid || !gridBtn || !listBtn) return;

    function applyView(view) {
      grid.classList.toggle("list-view", view === "list");
      gridBtn.classList.toggle("active", view === "grid");
      listBtn.classList.toggle("active", view === "list");
      gridBtn.setAttribute("aria-pressed", String(view === "grid"));
      listBtn.setAttribute("aria-pressed", String(view === "list"));
      localStorage.setItem("cosmos-view", view);
    }

    applyView(localStorage.getItem("cosmos-view") === "list" ? "list" : "grid");
    gridBtn.addEventListener("click", () => applyView("grid"));
    listBtn.addEventListener("click", () => applyView("list"));
  }

  function pricingClass(pricing) {
    const value = (pricing || "").toLowerCase();
    if (value.includes("grát") || value.includes("grat")) return "badge-pricing-gratis";
    if (value.includes("free")) return "badge-pricing-freemium";
    return "badge-pricing-pago";
  }

  async function initCatalogo() {
    const grid = document.getElementById("tools-grid");
    const emptyState = document.getElementById("tools-empty");
    const searchInput = document.getElementById("search-input");
    const filtersEl = document.getElementById("category-filters");

    let tools = [];
    try {
      const res = await fetch("data/tools.json", { cache: "no-store" });
      tools = await res.json();
    } catch (err) {
      grid.innerHTML = "";
      emptyState.hidden = false;
      emptyState.textContent = "Não foi possível carregar o catálogo agora.";
      return;
    }

    const categories = ["Todas", ...new Set(tools.map((t) => t.category).filter(Boolean))];
    let activeCategory = "Todas";
    let query = "";

    function renderFilters() {
      filtersEl.innerHTML = "";
      categories.forEach((category) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip" + (category === activeCategory ? " active" : "");
        btn.textContent = category;
        btn.addEventListener("click", () => {
          activeCategory = category;
          renderFilters();
          renderCards();
        });
        filtersEl.appendChild(btn);
      });
    }

    function renderCards() {
      const filtered = tools.filter((tool) => {
        const matchesCategory = activeCategory === "Todas" || tool.category === activeCategory;
        const matchesQuery = tool.name.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      });

      grid.innerHTML = "";
      emptyState.hidden = filtered.length > 0;

      filtered.forEach((tool, index) => {
        const card = document.createElement("article");
        card.className = "card";
        card.style.setProperty("--card-delay", `${Math.min(index, 10) * 40}ms`);
        card.innerHTML = `
          <h3>${escapeHtml(tool.name)}</h3>
          <p>${escapeHtml(tool.description || "")}</p>
          <div class="badge-row">
            <span class="badge badge-category">${escapeHtml(tool.category || "Outros")}</span>
            <span class="badge ${pricingClass(tool.pricing)}">${escapeHtml(tool.pricing || "")}</span>
          </div>
          <div class="card-actions">
            <a class="card-link" href="${escapeAttr(tool.link)}" target="_blank" rel="noopener noreferrer">Acessar site →</a>
            <a class="card-delete" href="${escapeAttr(deleteToolUrl(tool))}" target="_blank" rel="noopener noreferrer" title="Excluir esta ferramenta do catálogo" aria-label="Excluir ${escapeAttr(tool.name)} do catálogo">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Excluir</span>
            </a>
          </div>
        `;
        grid.appendChild(card);
        attachTilt(card);
      });
    }

    searchInput.addEventListener("input", (event) => {
      query = event.target.value;
      renderCards();
    });

    renderFilters();
    renderCards();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value || "#");
  }
})();

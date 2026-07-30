(function () {
  const config = window.COSMOS_CONFIG || {};
  const newToolUrl = config.repoUrl
    ? `${config.repoUrl}/issues/new?template=nova-ferramenta.yml`
    : "#";

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#new-tool-link, #new-tool-link-hero").forEach((el) => {
      el.href = newToolUrl;
    });

    initViewToggle();
    initCatalogo();
    initPortfolio();
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
          <a class="card-link" href="${escapeAttr(tool.link)}" target="_blank" rel="noopener noreferrer">Acessar site →</a>
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

  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async function loadManualProjects() {
    try {
      const res = await fetch("data/portfolio-extra.json", { cache: "no-store" });
      const projects = await res.json();
      return projects.map((project) => ({
        name: project.name,
        description: project.description || "Sem descrição.",
        link: project.link || "",
        thumb: project.image || (project.link ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(project.link)}?w=640` : ""),
        fallbackThumb: "",
        badge: "Meu projeto",
        stars: null,
      }));
    } catch {
      return [];
    }
  }

  async function loadGithubRepos(user) {
    if (!user) return [];
    try {
      const res = await fetch(`https://api.github.com/users/${user}/repos?sort=updated&per_page=100`);
      if (!res.ok) throw new Error("GitHub API error");
      const repos = await res.json();
      return repos
        .filter((repo) => !repo.fork && !repo.private)
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .map((repo) => {
          const ogImage = `https://opengraph.githubassets.com/1/${user}/${repo.name}`;
          return {
            name: repo.name,
            description: repo.description || "Sem descrição.",
            link: repo.homepage || repo.html_url,
            // Miniatura: screenshot real do site quando há homepage; senão, o
            // cartão social do repositório gerado pelo próprio GitHub.
            thumb: repo.homepage ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(repo.homepage)}?w=640` : ogImage,
            fallbackThumb: ogImage,
            badge: repo.language || null,
            stars: repo.stargazers_count,
          };
        });
    } catch {
      return [];
    }
  }

  async function initPortfolio() {
    const grid = document.getElementById("portfolio-grid");
    const emptyState = document.getElementById("portfolio-empty");

    // Projetos cadastrados manualmente (sem repositório no GitHub) aparecem
    // primeiro; depois, os repositórios públicos puxados automaticamente.
    const [manualItems, repoItems] = await Promise.all([
      loadManualProjects(),
      loadGithubRepos(config.githubUser),
    ]);
    const items = [...manualItems, ...repoItems];

    if (items.length === 0) {
      emptyState.hidden = false;
      return;
    }

    grid.innerHTML = "";
    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "card";
      card.style.setProperty("--card-delay", `${Math.min(index, 10) * 40}ms`);

      const thumbHtml = item.thumb
        ? `<img class="card-thumb" src="${escapeAttr(item.thumb)}" alt="Prévia de ${escapeHtml(item.name)}" loading="lazy">`
        : `<div class="card-thumb card-thumb-placeholder" aria-hidden="true">${escapeHtml(initials(item.name))}</div>`;

      card.innerHTML = `
        ${thumbHtml}
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="badge-row">
          ${item.badge ? `<span class="badge badge-category">${escapeHtml(item.badge)}</span>` : ""}
          ${item.stars !== null && item.stars !== undefined ? `<span class="badge badge-pricing-gratis">★ ${item.stars}</span>` : ""}
        </div>
        ${item.link ? `<a class="card-link" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">Ver projeto →</a>` : ""}
      `;

      const img = card.querySelector(".card-thumb");
      if (img && img.tagName === "IMG" && item.fallbackThumb) {
        img.addEventListener("error", () => {
          if (img.src !== item.fallbackThumb) img.src = item.fallbackThumb;
        });
      }

      grid.appendChild(card);
      attachTilt(card);
    });
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

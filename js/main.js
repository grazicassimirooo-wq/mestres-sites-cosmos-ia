(function () {
  const config = window.COSMOS_CONFIG || {};
  const newToolUrl = config.repoUrl
    ? `${config.repoUrl}/issues/new?template=nova-ferramenta.yml`
    : "#";

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#new-tool-link, #new-tool-link-hero").forEach((el) => {
      el.href = newToolUrl;
    });

    initCatalogo();
    initPortfolio();
  });

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

      filtered.forEach((tool) => {
        const card = document.createElement("article");
        card.className = "card";
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
      });
    }

    searchInput.addEventListener("input", (event) => {
      query = event.target.value;
      renderCards();
    });

    renderFilters();
    renderCards();
  }

  async function initPortfolio() {
    const grid = document.getElementById("portfolio-grid");
    const emptyState = document.getElementById("portfolio-empty");
    const user = config.githubUser;
    if (!user) return;

    try {
      const res = await fetch(`https://api.github.com/users/${user}/repos?sort=updated&per_page=100`);
      if (!res.ok) throw new Error("GitHub API error");
      const repos = await res.json();

      const visible = repos
        .filter((repo) => !repo.fork && !repo.private)
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

      if (visible.length === 0) {
        emptyState.hidden = false;
        return;
      }

      grid.innerHTML = "";
      visible.forEach((repo) => {
        const link = repo.homepage || repo.html_url;
        // Miniatura: screenshot real do site quando há homepage; senão, o
        // cartão social do repositório gerado pelo próprio GitHub.
        const ogImage = `https://opengraph.githubassets.com/1/${user}/${repo.name}`;
        const thumb = repo.homepage
          ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(repo.homepage)}?w=640`
          : ogImage;
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <img class="card-thumb" src="${escapeAttr(thumb)}" alt="Prévia de ${escapeHtml(repo.name)}" loading="lazy">
          <h3>${escapeHtml(repo.name)}</h3>
          <p>${escapeHtml(repo.description || "Sem descrição.")}</p>
          <div class="badge-row">
            ${repo.language ? `<span class="badge badge-category">${escapeHtml(repo.language)}</span>` : ""}
            <span class="badge badge-pricing-gratis">★ ${repo.stargazers_count}</span>
          </div>
          <a class="card-link" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">Ver projeto →</a>
        `;
        const img = card.querySelector(".card-thumb");
        img.addEventListener("error", () => {
          if (img.src !== ogImage) img.src = ogImage;
        });
        grid.appendChild(card);
      });
    } catch (err) {
      emptyState.hidden = false;
    }
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

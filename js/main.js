(function () {
  const config = window.COSMOS_CONFIG || {};
  const newToolUrl = config.repoUrl
    ? `${config.repoUrl}/issues/new?template=nova-ferramenta.yml`
    : "#";

  const TOKEN_KEY = "cosmos-gh-token";
  const DATA_PATH = "data/tools.json";

  function readToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveToken(value) {
    try {
      localStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* navegador anônimo ou storage bloqueado: segue sem persistir */
    }
  }

  function forgetToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* idem */
    }
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function decodeBase64(value) {
    const binary = atob(String(value).replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function githubApi(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${readToken()}`,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401 || response.status === 403) {
      const error = new Error("Token inválido ou sem permissão de escrita.");
      error.badToken = true;
      throw error;
    }
    if (!response.ok) {
      throw new Error(`GitHub respondeu ${response.status}.`);
    }
    return response.json();
  }

  function normalizeLink(link) {
    return String(link || "").trim().replace(/\/+$/, "").toLowerCase();
  }

  function sameTool(a, b) {
    if (a.id && b.id) return a.id === b.id;
    return normalizeLink(a.link) === normalizeLink(b.link);
  }

  // Lê tools.json pela API, remove a entrada e grava de volta. O push na main
  // dispara o deploy.yml, que republica a gh-pages sozinho.
  async function deleteToolFromRepo(tool) {
    const contentsPath = `/repos/${config.repoOwner}/${config.repoName}/contents/${DATA_PATH}`;
    const branch = config.repoBranch || "main";

    const file = await githubApi(`${contentsPath}?ref=${encodeURIComponent(branch)}`);
    const current = JSON.parse(decodeBase64(file.content));
    const next = current.filter((entry) => !sameTool(entry, tool));

    if (next.length === current.length) {
      throw new Error("Essa ferramenta já não está mais no catálogo.");
    }

    await githubApi(contentsPath, {
      method: "PUT",
      body: JSON.stringify({
        message: `Remove ${tool.name} do catálogo`,
        content: encodeBase64(`${JSON.stringify(next, null, 2)}\n`),
        sha: file.sha,
        branch,
      }),
    });
  }

  function showToast(message, variant = "ok") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${variant} toast-visible`;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, 4500);
  }

  function askForToken() {
    const dialog = document.getElementById("token-dialog");
    const input = document.getElementById("token-input");
    const errorEl = document.getElementById("token-error");
    const saveBtn = document.getElementById("token-save");
    const cancelBtn = document.getElementById("token-cancel");
    const forgetBtn = document.getElementById("token-forget");
    if (!dialog || !input) return Promise.resolve(false);

    return new Promise((resolve) => {
      input.value = "";
      errorEl.hidden = true;
      forgetBtn.hidden = !readToken();

      function cleanup(result) {
        saveBtn.removeEventListener("click", onSave);
        cancelBtn.removeEventListener("click", onCancel);
        forgetBtn.removeEventListener("click", onForget);
        input.removeEventListener("keydown", onKeydown);
        dialog.close();
        resolve(result);
      }

      function onSave() {
        const value = input.value.trim();
        if (!value) {
          errorEl.textContent = "Cole o token pra continuar.";
          errorEl.hidden = false;
          return;
        }
        saveToken(value);
        cleanup(true);
      }

      function onCancel() {
        cleanup(false);
      }

      function onForget() {
        forgetToken();
        showToast("Token removido deste navegador.", "ok");
        cleanup(false);
      }

      function onKeydown(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          onSave();
        }
      }

      saveBtn.addEventListener("click", onSave);
      cancelBtn.addEventListener("click", onCancel);
      forgetBtn.addEventListener("click", onForget);
      input.addEventListener("keydown", onKeydown);
      dialog.showModal();
      input.focus();
    });
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
            <button type="button" class="card-delete" title="Excluir esta ferramenta do catálogo" aria-label="Excluir ${escapeAttr(tool.name)} do catálogo">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Excluir</span>
            </button>
          </div>
        `;
        const deleteBtn = card.querySelector(".card-delete");
        deleteBtn.addEventListener("click", () => handleDelete(tool, deleteBtn));
        grid.appendChild(card);
        attachTilt(card);
      });
    }

    async function handleDelete(tool, button) {
      if (!window.confirm(`Excluir "${tool.name}" do catálogo?`)) return;

      if (!readToken() && !(await askForToken())) return;

      button.disabled = true;
      button.querySelector("span").textContent = "Excluindo...";

      try {
        await deleteToolFromRepo(tool);
        tools = tools.filter((entry) => !sameTool(entry, tool));
        renderCards();
        showToast(`"${tool.name}" foi removida. O site republica em ~1 min.`, "ok");
      } catch (error) {
        button.disabled = false;
        button.querySelector("span").textContent = "Excluir";

        if (error.badToken) {
          forgetToken();
          showToast("Token inválido ou sem permissão. Cadastre de novo.", "erro");
          if (await askForToken()) handleDelete(tool, button);
          return;
        }
        showToast(`Não deu pra excluir: ${error.message}`, "erro");
      }
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

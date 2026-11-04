(function () {
  const config = window.COSMOS_CONFIG || {};
  const newToolUrl = config.repoUrl
    ? `${config.repoUrl}/issues/new?template=nova-ferramenta.yml`
    : "#";

  const TOKEN_KEY = "cosmos-gh-token";
  const DATA_PATH = "data/tools.json";
  const SITE_PATH = "data/site.json";

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

    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
      throw new Error("Limite de requisições do GitHub atingido. Tente de novo em alguns minutos.");
    }
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

  // Lê um JSON do repo pela API, aplica `mutate` e grava de volta. O push na
  // main dispara o deploy.yml, que republica a gh-pages sozinho.
  async function updateRepoJson(dataPath, mutate, message) {
    const contentsPath = `/repos/${config.repoOwner}/${config.repoName}/contents/${dataPath}`;
    const branch = config.repoBranch || "main";

    const file = await githubApi(`${contentsPath}?ref=${encodeURIComponent(branch)}`);
    const current = JSON.parse(decodeBase64(file.content));
    const next = mutate(current);

    await githubApi(contentsPath, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: encodeBase64(`${JSON.stringify(next, null, 2)}\n`),
        sha: file.sha,
        branch,
      }),
    });
  }

  function deleteToolFromRepo(tool) {
    return updateRepoJson(DATA_PATH, (current) => {
      const next = current.filter((entry) => !sameTool(entry, tool));
      if (next.length === current.length) {
        throw new Error("Essa ferramenta já não está mais no catálogo.");
      }
      return next;
    }, `Remove ${tool.name} do catálogo`);
  }

  function editToolInRepo(tool, values) {
    return updateRepoJson(DATA_PATH, (current) => {
      let found = false;
      const next = current.map((entry) => {
        if (!sameTool(entry, tool)) return entry;
        found = true;
        return { ...entry, ...values };
      });
      if (!found) throw new Error("Essa ferramenta não está mais no catálogo.");
      return next;
    }, `Edita ${tool.name} no catálogo`);
  }

  function saveSiteTextsToRepo(values) {
    return updateRepoJson(SITE_PATH, (current) => ({ ...current, ...values }), "Edita textos do site");
  }

  // Garante token, executa a ação e, se o token for rejeitado, pede de novo.
  async function withToken(action) {
    if (!readToken() && !(await askForToken())) return false;
    try {
      await action();
      return true;
    } catch (error) {
      if (!error.badToken) throw error;
      forgetToken();
      showToast("Token inválido ou sem permissão. Cadastre de novo.", "erro");
      if (!(await askForToken())) return false;
      await action();
      return true;
    }
  }

  // Abre um <dialog> com formulário, preenche os campos e devolve os valores
  // (ou null se cancelar). `onSubmit` pode lançar erro — fica no formulário.
  function openEditDialog(dialog, values, onSubmit) {
    const form = dialog.querySelector("[data-edit-form]");
    const errorEl = dialog.querySelector("[data-edit-error]");
    const cancelBtn = dialog.querySelector("[data-edit-cancel]");
    const submitBtn = form.querySelector("[type=submit]");

    Array.from(form.elements).forEach((el) => {
      if (el.name && el.name in values) el.value = values[el.name] ?? "";
    });
    errorEl.hidden = true;

    return new Promise((resolve) => {
      let busy = false;
      function cleanup(result) {
        form.removeEventListener("submit", onFormSubmit);
        cancelBtn.removeEventListener("click", onCancel);
        dialog.removeEventListener("close", onClose);
        if (dialog.open) dialog.close();
        resolve(result);
      }
      function onCancel() { if (!busy) cleanup(null); }
      function onClose() { if (!busy) cleanup(null); }
      async function onFormSubmit(event) {
        event.preventDefault();
        if (busy) return;
        const data = {};
        Array.from(form.elements).forEach((el) => {
          if (el.name) data[el.name] = String(el.value).trim();
        });
        busy = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Salvando...";
        try {
          await onSubmit(data);
          busy = false;
          cleanup(data);
        } catch (error) {
          busy = false;
          errorEl.textContent = `Não deu pra salvar: ${error.message}`;
          errorEl.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Salvar";
        }
      }
      form.addEventListener("submit", onFormSubmit);
      cancelBtn.addEventListener("click", onCancel);
      dialog.addEventListener("close", onClose);
      dialog.showModal();
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
    initVideoDialog();
    initSiteTexts();
    initMotion();
    initCatalogo();
  });

  // ── Textos editáveis do site (hero + sobre) ──────────────────────────
  let siteTexts = null;

  function setTitle(el, text) {
    // `*palavra*` vira destaque; cada palavra sobe em sequência (motion).
    let i = 0;
    const html = escapeHtml(text)
      .split(/(\*[^*]+\*)/)
      .map((part) => {
        const emphasis = /^\*[^*]+\*$/.test(part);
        const words = (emphasis ? part.slice(1, -1) : part).split(/(\s+)/);
        const inner = words
          .map((w) => (/^\s*$/.test(w) ? w : `<span class="w"><span style="--i:${i++}">${w}</span></span>`))
          .join("");
        return emphasis ? `<em>${inner}</em>` : inner;
      })
      .join("");
    el.innerHTML = html;
  }

  function applySiteTexts(texts) {
    document.querySelectorAll("[data-site]").forEach((el) => {
      const value = texts[el.dataset.site];
      if (typeof value !== "string" || !value) return;
      if (el.dataset.site === "heroTitle") setTitle(el, value);
      else el.textContent = value;
    });
  }

  async function initSiteTexts() {
    const heroTitle = document.querySelector('[data-site="heroTitle"]');
    try {
      const res = await fetch(`${SITE_PATH}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      siteTexts = await res.json();
    } catch {
      siteTexts = null; // mantém o texto padrão que já está no HTML
    }
    if (siteTexts) applySiteTexts(siteTexts);
    else if (heroTitle) setTitle(heroTitle, heroTitle.textContent);

    const btn = document.getElementById("edit-site-btn");
    const dialog = document.getElementById("site-dialog");
    if (!btn || !dialog) return;
    btn.addEventListener("click", async () => {
      const current = {};
      document.querySelectorAll("[data-site]").forEach((el) => {
        current[el.dataset.site] = el.dataset.site === "heroTitle"
          ? (siteTexts && siteTexts.heroTitle) || el.textContent
          : el.textContent;
      });
      if (!readToken() && !(await askForToken())) return;
      const saved = await openEditDialog(dialog, current, async (values) => {
        const ok = await withToken(() => saveSiteTextsToRepo(values));
        if (!ok) throw new Error("token não informado.");
      });
      if (saved) {
        siteTexts = { ...(siteTexts || {}), ...saved };
        applySiteTexts(siteTexts);
        showToast("Textos salvos. O site republica em ~1 min.", "ok");
      }
    });
  }

  // ── Motion: progresso de rolagem, revelações, marquee ─────────────────
  function initMotion() {
    const bar = document.querySelector(".scroll-progress");
    if (bar) {
      let ticking = false;
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
        ticking = false;
      };
      window.addEventListener("scroll", () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }

    const targets = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    document.documentElement.classList.add("js-motion");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((el) => io.observe(el));
  }

  function buildMarquee(tools) {
    const track = document.getElementById("marquee-track");
    if (!track) return;
    const names = tools.map((t) => t.name).filter(Boolean);
    if (!names.length) { track.parentElement.hidden = true; return; }
    track.parentElement.hidden = false;
    const row = names.map((n) => `<span>${escapeHtml(n)}</span>`).join("");
    track.innerHTML = `<div class="marquee-row">${row}</div><div class="marquee-row">${row}</div>`;
  }

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
      try {
        localStorage.setItem("cosmos-view", view);
      } catch {
        /* storage bloqueado: a preferência vale só nesta visita */
      }
    }

    let savedView = "grid";
    try {
      savedView = localStorage.getItem("cosmos-view") === "list" ? "list" : "grid";
    } catch {
      /* idem */
    }
    applyView(savedView);
    gridBtn.addEventListener("click", () => applyView("grid"));
    listBtn.addEventListener("click", () => applyView("list"));
  }

  // Aceita watch?v=, youtu.be, /shorts/, /embed/ e /live/. Devolve o id ou "".
  function youtubeId(url) {
    try {
      const u = new URL(String(url || "").trim());
      const host = u.hostname.replace(/^www\.|^m\./, "");
      let id = "";
      if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
      else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
        else {
          const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?]+)/);
          id = m ? m[1] : "";
        }
      }
      return /^[\w-]{11}$/.test(id) ? id : "";
    } catch {
      return "";
    }
  }

  function openVideo(tool) {
    const dialog = document.getElementById("video-dialog");
    const id = youtubeId(tool.video);
    if (!dialog || !id) return;
    document.getElementById("video-title").textContent = tool.name;
    document.getElementById("video-caption").textContent = tool.videoCaption || "";
    document.getElementById("video-frame").innerHTML =
      `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Vídeo: ${escapeAttr(tool.name)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    dialog.showModal();
  }

  function initVideoDialog() {
    const dialog = document.getElementById("video-dialog");
    if (!dialog) return;
    // fechar descarrega o iframe para o vídeo parar de tocar
    dialog.addEventListener("close", () => {
      document.getElementById("video-frame").innerHTML = "";
    });
    document.getElementById("video-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
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

    const getCategories = () => ["Todas", ...new Set(tools.map((t) => t.category).filter(Boolean))];
    let activeCategory = "Todas";
    let query = "";

    function renderFilters() {
      const categories = getCategories();
      if (!categories.includes(activeCategory)) activeCategory = "Todas";
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
        const matchesQuery = !query
          || fold(`${tool.name} ${tool.description || ""}`).includes(fold(query));
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
          ${videoBlock(tool)}
          <div class="badge-row">
            <span class="badge badge-category">${escapeHtml(tool.category || "Outros")}</span>
            <span class="badge ${pricingClass(tool.pricing)}">${escapeHtml(tool.pricing || "")}</span>
          </div>
          <div class="card-actions">
            <a class="card-link" href="${escapeAttr(tool.link)}" target="_blank" rel="noopener noreferrer">Acessar site →</a>
            <button type="button" class="card-edit" title="Editar esta ferramenta" aria-label="Editar ${escapeAttr(tool.name)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
              <span>Editar</span>
            </button>
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
        const videoBtn = card.querySelector(".card-video");
        if (videoBtn) videoBtn.addEventListener("click", () => openVideo(tool));
        card.querySelector(".card-edit").addEventListener("click", () => handleEdit(tool));
        const deleteBtn = card.querySelector(".card-delete");
        deleteBtn.addEventListener("click", () => handleDelete(tool, deleteBtn));
        grid.appendChild(card);
        attachTilt(card);
      });
    }

    async function handleEdit(tool) {
      const dialog = document.getElementById("tool-dialog");
      if (!dialog) return;
      if (!readToken() && !(await askForToken())) return;
      const saved = await openEditDialog(dialog, tool, async (values) => {
        if (!values.name || !values.link) throw new Error("nome e link são obrigatórios.");
        if (values.video && !youtubeId(values.video)) {
          throw new Error("o link do vídeo precisa ser do YouTube (youtube.com ou youtu.be).");
        }
        const ok = await withToken(() => editToolInRepo(tool, values));
        if (!ok) throw new Error("token não informado.");
      });
      if (!saved) return;
      const index = tools.findIndex((entry) => sameTool(entry, tool));
      if (index >= 0) tools[index] = { ...tools[index], ...saved };
      renderFilters();
      renderCards();
      buildMarquee(tools);
      showToast(`"${saved.name}" atualizada. O site republica em ~1 min.`, "ok");
    }

    async function handleDelete(tool, button) {
      if (!window.confirm(`Excluir "${tool.name}" do catálogo?`)) return;
      await runDelete(tool, button);
    }

    async function runDelete(tool, button) {
      if (!readToken() && !(await askForToken())) return;

      button.disabled = true;
      button.querySelector("span").textContent = "Excluindo...";

      try {
        await deleteToolFromRepo(tool);
        tools = tools.filter((entry) => !sameTool(entry, tool));
        renderFilters();
        renderCards();
        buildMarquee(tools);
        showToast(`"${tool.name}" foi removida. O site republica em ~1 min.`, "ok");
      } catch (error) {
        button.disabled = false;
        button.querySelector("span").textContent = "Excluir";

        if (error.badToken) {
          forgetToken();
          showToast("Token inválido ou sem permissão. Cadastre de novo.", "erro");
          if (await askForToken()) await runDelete(tool, button);
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
    buildMarquee(tools);
  }

  function videoBlock(tool) {
    const id = youtubeId(tool.video);
    if (!id) return "";
    const caption = tool.videoCaption
      ? `<span class="card-video-caption">${escapeHtml(tool.videoCaption)}</span>` : "";
    return `
          <button type="button" class="card-video" aria-label="Assistir ao vídeo sobre ${escapeAttr(tool.name)}">
            <span class="card-video-thumb">
              <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">
              <span class="card-video-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg></span>
            </span>
            ${caption}
          </button>`;
  }

  function fold(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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

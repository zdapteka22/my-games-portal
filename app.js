(() => {
  const STORAGE_GAMES = "myGamesPortal_customGames_v1";
  const STORAGE_REVIEWS = "myGamesPortal_reviews_v1";

  /** Встроенные игры портала */
  const BUILTIN_GAMES = [
    {
      id: "snake",
      title: "Змейка",
      description: "Классика: ешь, расти, не врежься в стены и в себя!",
      url: "games/minis/snake.html",
      emoji: "🐍",
      color: "#4caf50",
      builtin: true,
    },
    {
      id: "pacman",
      title: "Пакман",
      description: "Собирай точки, ешь энергетики и убегай от призраков!",
      url: "games/minis/pacman.html",
      emoji: "🟡",
      img: "images/niouuutk7kxy85x5teac44aq0996llta.png",
      color: "#ffcc00",
      builtin: true,
    },
    {
      id: "mario",
      title: "Зелёный Марио (9 уровней)",
      description: "Платформер: беги, прыгай, собирай монеты и дойди до флага!",
      url: "games/minis/mario.html",
      emoji: "🍄",
      img: "images/e091479ed98337ac93d30276ab079ea8.jpg",
      color: "#e52521",
      builtin: true,
    },
    {
      id: "smeshariki",
      title: "Смешарики — Битва и Догонялки",
      description: "Страница игры: битва, догонялки, голя, персонажи.",
      url: "games/smeshariki/index.html",
      emoji: "🟡",
      color: "#ffcc00",
      builtin: true,
    },
  ];

  const AI_NAMES = [
    "GrokPlay", "PixelBot", "Critic-9000", "НейроКрош", "AI-Ежик",
    "ByteBarash", "ReviewLLM", "FunModel-7B", "GameSense AI",
  ];

  const AI_TEMPLATES = [
    "Затягивает сильнее, чем ожидалось. Управление отзывчивое, а режимы дают разный вайб. Оценка: топ для фанатской мини-игры!",
    "Мне нравится идея: быстро зашёл — и уже в битве. Музыка + персонажи = уютный хаос. Хочется ещё уровней.",
    "Как ИИ, я прогнал «виртуальные» 100 партий: баланс ок, весело, иногда бесит — значит, работает 😄",
    "Интерфейс простой, смысл понятен за 10 секунд. Отличный проект для браузера. Рекомендую друзьям-смешарикам.",
    "Режим догонялок — мой фаворит. Битва чуть хаотичнее, но в этом и кайф. Ставлю почти максимум!",
    "Видно, что сделано с душой. Не AAA, но атмосфера и управление на месте. Играть можно прямо сейчас.",
    "Плюсы: скорость, персонажи, несколько режимов. Минусы: хочется ещё контента. Всё равно советую!",
    "Если открыть в отдельном окне — полный иммерсив. Браузерная классика нового поколения 🔥",
    "Оценка по шкале ИИ: «вау, работает и весело». Для портала — идеальная главная игра.",
    "Свой уровень — крутая фишка. Можно фантазировать и делиться. Отзыв: бери и играй.",
  ];

  // --- storage helpers ---
  function loadCustomGames() {
    try {
      const raw = localStorage.getItem(STORAGE_GAMES);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveCustomGames(list) {
    localStorage.setItem(STORAGE_GAMES, JSON.stringify(list));
  }

  function loadReviews() {
    try {
      const raw = localStorage.getItem(STORAGE_REVIEWS);
      const list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list) && list.length) return list;
    } catch { /* ignore */ }
    return seedReviews();
  }

  function saveReviews(list) {
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(list.slice(0, 40)));
  }

  function allGames() {
    return [...BUILTIN_GAMES, ...loadCustomGames()];
  }

  function seedReviews() {
    const seeded = [
      makeReview("smeshariki", 5),
      makeReview("smeshariki", 4),
      makeReview("smeshariki", 5),
    ];
    saveReviews(seeded);
    return seeded;
  }

  function makeReview(gameId, stars) {
    const game = allGames().find((g) => g.id === gameId);
    return {
      id: "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      gameId,
      gameTitle: game ? game.title : "Игра",
      author: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
      stars: stars || 3 + Math.floor(Math.random() * 3),
      text: AI_TEMPLATES[Math.floor(Math.random() * AI_TEMPLATES.length)],
      createdAt: Date.now(),
    };
  }

  // --- open game ---
  function openGameWindow(url) {
    if (!url) {
      toast("Нет ссылки на игру");
      return;
    }

    // Абсолютный URL для надёжного открытия
    let fullUrl = url;
    try {
      fullUrl = new URL(url, window.location.href).href;
    } catch {
      fullUrl = url;
    }

    // Марио — в этом же окне, без второго popup
    if (/mario\.html/i.test(fullUrl) || /mario\.html/i.test(url)) {
      window.location.href = fullUrl;
      return;
    }

    const features = [
      "popup=yes",
      "noopener",
      "noreferrer",
      "width=980",
      "height=720",
      "left=80",
      "top=40",
      "menubar=no",
      "toolbar=no",
      "location=yes",
      "status=no",
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");

    const win = window.open(fullUrl, "gameWindow_" + Date.now(), features);

    if (!win || win.closed) {
      // Если попап заблокирован — открываем вкладку
      const a = document.createElement("a");
      a.href = fullUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Игра открыта во вкладке (разреши всплывающие окна для отдельного окна)");
    } else {
      try { win.focus(); } catch { /* ignore */ }
      toast("Игра открыта в новом окне 🎮");
    }
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2800);
  }

  // --- render ---
  function renderGames() {
    const grid = document.getElementById("gamesGrid");
    if (!grid) return;
    const games = allGames();
    grid.innerHTML = games
      .map(
        (g) => `
      <article class="game-card" style="--card-accent:${escapeAttr(g.color || "#ffcc00")}">
        <div class="cover">${escapeHtml(g.emoji || "🎮")}</div>
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.description || "Без описания")}</p>
        <div class="meta">
          <span class="tag ${g.builtin ? "" : "custom"}">${g.builtin ? "Встроенная" : "Моя игра"}</span>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-primary btn-sm" data-play="${escapeAttr(g.url)}">▶ Играть</button>
          ${
            g.builtin
              ? ""
              : `<button type="button" class="btn btn-danger btn-sm" data-delete="${escapeAttr(g.id)}">Удалить</button>`
          }
        </div>
      </article>`
      )
      .join("");
  }

  function renderReviews() {
    const grid = document.getElementById("reviewsGrid");
    if (!grid) return;
    const reviews = loadReviews().slice().sort((a, b) => b.createdAt - a.createdAt);
    grid.innerHTML = reviews
      .map(
        (r) => `
      <article class="review-card">
        <div class="review-top">
          <span class="review-ai">🤖 ${escapeHtml(r.author)}</span>
          <span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
        </div>
        <p>${escapeHtml(r.text)}</p>
        <div class="review-game">об игре: ${escapeHtml(r.gameTitle)}</div>
      </article>`
      )
      .join("");
  }

  function fillReviewSelect() {
    const sel = document.getElementById("reviewGameSelect");
    if (!sel) return;
    const games = allGames();
    sel.innerHTML = games
      .map((g) => `<option value="${escapeAttr(g.id)}">${escapeHtml(g.title)}</option>`)
      .join("");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  // --- events ---
  document.addEventListener("click", (e) => {
    const playBtn = e.target.closest("[data-play]");
    if (playBtn) {
      e.preventDefault();
      openGameWindow(playBtn.getAttribute("data-play"));
      return;
    }

    const delBtn = e.target.closest("[data-delete]");
    if (delBtn) {
      const id = delBtn.getAttribute("data-delete");
      const next = loadCustomGames().filter((g) => g.id !== id);
      saveCustomGames(next);
      refresh();
      toast("Игра удалена");
    }
  });

  document.getElementById("genReviewBtn")?.addEventListener("click", () => {
    const sel = document.getElementById("reviewGameSelect");
    const gameId = sel?.value || "smeshariki";
    const review = makeReview(gameId);
    const list = loadReviews();
    list.unshift(review);
    saveReviews(list);
    renderReviews();
    toast("Новый отзыв ИИ добавлен ✨");
  });

  document.getElementById("addGameForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const url = String(fd.get("url") || "").trim();
    const emoji = String(fd.get("emoji") || "🎮").trim() || "🎮";
    const color = String(fd.get("color") || "#ff9f1c");

    if (!title || !url) {
      toast("Заполни название и ссылку");
      return;
    }

    const game = {
      id: "custom_" + Date.now(),
      title,
      description,
      url,
      emoji,
      color,
      builtin: false,
    };

    const list = loadCustomGames();
    list.unshift(game);
    saveCustomGames(list);

    // Авто-отзыв ИИ на новую игру
    const reviews = loadReviews();
    reviews.unshift(makeReview(game.id, 4 + Math.floor(Math.random() * 2)));
    saveReviews(reviews);

    form.reset();
    form.elements.emoji.value = "🎮";
    form.elements.color.value = "#ff9f1c";

    const note = document.getElementById("formNote");
    if (note) note.textContent = "Игра «" + title + "» добавлена!";

    refresh();
    toast("Игра добавлена в каталог");
    document.getElementById("games")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("clearCustomBtn")?.addEventListener("click", () => {
    if (!loadCustomGames().length) {
      toast("Своих игр пока нет");
      return;
    }
    if (!confirm("Удалить все добавленные тобой игры?")) return;
    saveCustomGames([]);
    refresh();
    toast("Все свои игры удалены");
  });

  function refresh() {
    renderGames();
    fillReviewSelect();
    renderReviews();
  }

  refresh();
})();

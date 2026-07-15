/* Lobby AI chat + Support chat for index.html */
(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    const log = document.getElementById("aiChatLog");
    if (!log) return;

    const live = document.getElementById("aiChatLive");
    const autoBtn = document.getElementById("aiChatAuto");
    const voiceBtn = document.getElementById("aiChatVoice");
    const micBtn = document.getElementById("aiChatMic");
    const sendBtn = document.getElementById("aiChatSend");
    const input = document.getElementById("aiChatInput");
    const tabLobby = document.getElementById("chatTabLobby");
    const tabSupport = document.getElementById("chatTabSupport");
    const tabPlayers = document.getElementById("chatTabPlayers");
    const MAX = 100;

    let mode = "lobby"; // lobby | support | players
    let autoOn = true;
    let autoT = null;
    let voiceOn = false; // диктор ВЫКЛ — без озвучки чата
    let micOn = false;
    let recognition = null;
    let speakQueue = [];
    let speaking = false;
    let lastSpeaker = "";
    let lastUserMsg = "";
    let dialogI = 0;
    let topicDay = 0;

    const YT = [
      { name: "📺 Домера", lines: ["Битва сегодня огонь.", "Командный 🔵🔴 — топ.", "FPS 60 и не ной."] },
      { name: "🔊 Дерзко", lines: ["Эй, кто в лабиринт?", "Отзывы после входа!", "Симпсоны в битве — кайф."] },
      { name: "🎤 Ваня AI", lines: ["Музыка «Погоня» — вайб.", "С другом: WASD + стрелки.", "Пишите — ответим."] }
    ];
    const KIDS = [
      { name: "🧒 Миша, 8", lines: ["Змейка рекорд мой!", "Барт имба!", "Мама 20 минут… уже час."] },
      { name: "👧 Лера, 9", lines: ["Смешарики топ 💛", "Танчики с подругой.", "Командный бой — огонь."] },
      { name: "🧒 Тима, 10", lines: ["45 FPS на телефоне.", "Пакман злые призраки.", "Хочу ещё героев."] }
    ];
    const ALL = YT.concat(KIDS);

    const DAY_TOPICS = [
      "какая игра сегодня топ",
      "утро — во что играть",
      "вечерний стрим",
      "погода и настроение для битвы",
      "школа/учёба и 15 минут портала",
      "выходные и марафон уровней",
      "кто кого в командном бою",
      "рекорды змейки за сегодня",
      "новый герой в битве",
      "музыка в играх"
    ];

    function pick(a) {
      return a[Math.floor(Math.random() * a.length)];
    }
    function userNick() {
      try {
        const u = JSON.parse(localStorage.getItem("portal_user_v1") || "null");
        if (u && u.name) return String(u.name).slice(0, 20);
      } catch (_) {}
      return "Игрок";
    }
    function toast(t) {
      if (typeof window.toast === "function") window.toast(t);
      else {
        const el = document.getElementById("toast");
        if (el) {
          el.hidden = false;
          el.textContent = t;
          clearTimeout(toast._t);
          toast._t = setTimeout(function () {
            el.hidden = true;
          }, 2500);
        }
      }
    }

    function trimLog() {
      while (log.children.length > MAX) log.removeChild(log.firstChild);
    }

    function setLive() {
      if (!live) return;
      if (mode === "support") {
        live.textContent = "🛟 Поддержка Blue Cat · отвечаю как ИИ-помощник";
        live.style.color = "#5eb0ff";
      } else if (mode === "players") {
        live.textContent = "🌍 Общий чат игроков · сообщения для всех (облако)";
        live.style.color = "#fbbf24";
      } else {
        live.textContent =
          (autoOn ? "● авто" : "○ пауза") +
          " · " +
          (voiceOn ? "🔊 войс иногда" : "🔇 без войса") +
          " · пишут текстом, редко 🎙 голосовые";
        live.style.color = autoOn ? "#4ade80" : "#888";
      }
      if (autoBtn) {
        autoBtn.hidden = mode !== "lobby";
        autoBtn.textContent = autoOn ? "⏸ Пауза" : "▶ Болтать";
      }
      if (voiceBtn) voiceBtn.textContent = voiceOn ? "🔊 Войс ВКЛ" : "🔇 Войс ВЫКЛ";
      if (micBtn) {
        micBtn.textContent = micOn ? "⏹" : "🎤";
        micBtn.style.background = micOn ? "#5a2020" : "";
      }
      [tabLobby, tabSupport, tabPlayers].forEach(function (b) {
        if (!b) return;
        const on =
          (b === tabLobby && mode === "lobby") ||
          (b === tabSupport && mode === "support") ||
          (b === tabPlayers && mode === "players");
        b.classList.toggle("active", on);
        b.style.background = on ? "#ffcc00" : "#222";
        b.style.color = on ? "#111" : "#ddd";
      });
    }

    function cleanSpeak(t) {
      return String(t || "")
        .replace(/[📺🔊🎤🧒👧👤🤖🛟🎙]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function stopDictor() {
      speakQueue = [];
      speaking = false;
      try {
        if (window.speechSynthesis) {
          speechSynthesis.cancel();
        }
      } catch (_) {}
    }
    function speakVoice(who, text) {
      // диктор отключён — не озвучиваем
      return;
    }
    function flushSpeak() {
      speakQueue = [];
      speaking = false;
    }

    /** kind: text only — без диктора / TTS */
    function bubble(who, text, tone, kind) {
      kind = "text";

      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-direction:column;gap:2px;max-width:92%";
      if (tone === "me" || tone === "user") row.style.alignSelf = "flex-end";
      const name = document.createElement("div");
      name.style.cssText =
        "font-size:11px;font-weight:800;color:" +
        (tone === "support"
          ? "#5eb0ff"
          : tone === "yt"
            ? "#fb923c"
            : tone === "kid"
              ? "#4ade80"
              : tone === "me" || tone === "user"
                ? "#93c5fd"
                : "#ddd");
      name.textContent = who + (kind === "voice" ? " · 🎙 голосовое" : "");
      const msg = document.createElement("div");
      if (kind === "voice") {
        msg.style.cssText =
          "background:linear-gradient(135deg,#1a2a3a,#111);border:1px solid #3b82f6;border-radius:16px;padding:10px 14px;font-size:14px;color:#e0f2fe;line-height:1.35";
        msg.innerHTML =
          "<span style='opacity:.85'>🎙 ▮▮▮▮▯▯</span> <span style='margin-left:6px'></span>";
        msg.querySelector("span:last-child").textContent = text;
      } else {
        msg.style.cssText =
          "background:" +
          (tone === "me" || tone === "user" ? "#1e3a5f" : tone === "support" ? "#0f1a28" : "#1a1a1a") +
          ";border:1px solid #333;border-radius:12px;padding:8px 12px;font-size:14px;color:#eee;line-height:1.35";
        msg.textContent = text;
      }
      row.appendChild(name);
      row.appendChild(msg);
      log.appendChild(row);
      trimLog();
      log.scrollTop = log.scrollHeight;
      lastSpeaker = who;
      // озвучка/диктор отключены
    }

    function clearLog() {
      log.innerHTML = "";
    }

    /* —— Support AI —— */
    function supportAnswer(q) {
      const s = String(q || "").toLowerCase();
      const nick = userNick();
      if (/привет|хай|здрав/.test(s))
        return "Привет, " + nick + "! Я поддержка Blue Cat. Спроси про игры, вход, отзывы, битву, чат.";
      if (/вход|google|гугл|регистр/.test(s))
        return "Вход: кнопка «Зарегистрироваться через Google» (нужен Client ID в auth-config.js) или «гость». После входа отзывы пишутся от твоего ника.";
      if (/отзыв/.test(s))
        return "Отзыв: вкладка «Мой отзыв» или на странице игры. Нужен вход. Чтобы другие видели — нужен рабочий sharedUrl (облако). Локально отзыв только на этом устройстве.";
      if (/чат|сообщ|не видят|другие/.test(s))
        return "Почему другие не видят сообщения: без облака всё в localStorage только у тебя. Вкладка «Игроки» шлёт в общее облако (crudcrud). Если облако упало — «только здесь». Админ обновляет data/reviews-config.json (chatUrl).";
      if (/битв|команд|ffa|симпсон|fps/.test(s))
        return "Битва: FFA или командный 🔵🔴. FPS −/+. Герои в images/heroes. С другом: P1 WASD, P2 стрелки.";
      if (/премиум|premium|10/.test(s))
        return "Premium 10₽ — кнопка ⭐. Код теста: BLUECAT10. Открывает типы создания игр.";
      if (/голос|войс|микроф|диктор/.test(s))
        return "В чате ИИ пишут текстом. Иногда (рандом) — 🎙 голосовое, тогда озвучка. Не диктор на каждое сообщение. 🔇 выключает войс.";
      if (/баг|не работ|слом|ошиб/.test(s))
        return "Попробуй Ctrl+F5. Напиши, в какой игре/кнопке баг. Локально: Desktop\\my-games-portal.";
      return (
        "Принял: «" +
        String(q).slice(0, 80) +
        "». " +
        pick([
          "Открой нужную игру через play.html?id=… — там свой чат и отзывы.",
          "Проверь вход и облако для общих сообщений.",
          "Если вопрос про героя — в битве Ctrl+F5 после обновления артов."
        ])
      );
    }

    /* —— Lobby AI talk —— */
    function short(s, n) {
      s = String(s || "").replace(/\s+/g, " ").trim();
      return s.length <= n ? s : s.slice(0, n) + "…";
    }
    function topicLine(seed, toUser) {
      const nick = userNick();
      const s = String(seed || "").toLowerCase();
      const to = toUser ? nick + ", " : "";
      if (/привет|хай/.test(s)) return to + "хай! во что сегодня?";
      if (/битв|команд/.test(s)) return to + "в битве FFA или командный — я за 🔵";
      if (/змейк|пакман|марио|танк|лабиринт/.test(s)) return to + "го в эту игру, не ссы";
      if (/день|утр|вечер|ночь|погод/.test(s)) return to + "такой день — самое то для рекорда";
      if (/fps/.test(s)) return to + "ставь 60 FPS и играй";
      return to + "про «" + short(seed, 28) + "» — " + pick(["согласен", "спорно", "огонь", "норм"]);
    }

    function replyToUser(text) {
      lastUserMsg = text;
      const a = pick(YT);
      const b = pick(KIDS);
      const c = pick(ALL);
      setTimeout(function () {
        bubble(a.name, topicLine(text, true), "yt", "text");
      }, 300);
      setTimeout(function () {
        bubble(b.name, topicLine(text, true), "kid", "text");
      }, 1000);
      setTimeout(function () {
        bubble(c.name, pick(ALL).name.split(" ")[0] + ", " + topicLine(text, false), Math.random() < 0.5 ? "yt" : "kid", "text");
      }, 1800);
      setTimeout(function () {
        const d = pick(ALL);
        bubble(d.name, pick(["Ок, дальше болтаем.", "Кто в игру?", userNick() + ", пиши ещё — ответим."]), Math.random() < 0.5 ? "yt" : "kid", Math.random() < 0.25 ? "voice" : "text");
      }, 2600);
    }

    function autoTick() {
      if (!autoOn || mode !== "lobby") return;
      topicDay = (topicDay + 1) % DAY_TOPICS.length;
      const topic = DAY_TOPICS[topicDay];
      const a = pick(YT);
      const b = pick(KIDS);
      bubble(a.name, pick([
        "Кста, " + topic + "?",
        "Эй, " + topic + " — кто что думает?",
        pick(a.lines) + " А ещё " + topic + "."
      ]), "yt", "text");
      setTimeout(function () {
        if (!autoOn || mode !== "lobby") return;
        bubble(b.name, pick([
          a.name.split(" ")[0] + ", " + topicLine(topic, false),
          pick(b.lines),
          "Сегодня " + topic + " — я за!"
        ]), "kid", Math.random() < 0.2 ? "voice" : "text");
      }, 1200);
      setTimeout(function () {
        if (!autoOn || mode !== "lobby") return;
        const c = pick(ALL);
        bubble(c.name, pick([
          "Спорите 😂 " + (lastUserMsg ? userNick() + " тоже писал про это." : "Пусть " + userNick() + " влезет."),
          pick(c.lines),
          "Бесконечный вайб: игры, день, рекорды…"
        ]), Math.random() < 0.5 ? "yt" : "kid", Math.random() < 0.22 ? "voice" : "text");
      }, 2400);
    }

    function startAuto() {
      autoOn = true;
      setLive();
      if (autoT) clearInterval(autoT);
      autoT = setInterval(autoTick, 4500);
    }
    function stopAuto() {
      autoOn = false;
      setLive();
      if (autoT) {
        clearInterval(autoT);
        autoT = null;
      }
    }

    /* —— Players shared chat —— */
    async function renderPlayers() {
      clearLog();
      bubble("🌍 Чат", "Сообщения игроков. Другие увидят, если облако отвечает. Иначе — только на этом устройстве.", "support", "text");
      if (!window.PortalChat) {
        bubble("🛟 Поддержка", "Модуль chat-shared.js не загрузился.", "support", "text");
        return;
      }
      const list = await PortalChat.list("lobby");
      list
        .slice()
        .reverse()
        .forEach(function (m) {
          bubble(
            (m.who || "Игрок") + (m.shared ? "" : " · только здесь"),
            m.text,
            "user",
            m.kind === "voice" ? "voice" : "text"
          );
        });
      if (!list.length) bubble("🌍 Чат", "Пока пусто — напиши первым!", "support", "text");
    }

    async function sendPlayers(text) {
      const who = userNick();
      const kind = Math.random() < 0.12 ? "voice" : "text";
      bubble("👤 " + who, text, "me", kind);
      const r = await PortalChat.send("lobby", who, text, { kind: kind, role: "user" });
      if (r.shared) toast("Сообщение ушло в общий чат");
      else toast("Сохранено только здесь — облако недоступно (другие не видят)");
    }

    /* —— mode switch —— */
    function switchMode(m) {
      mode = m;
      clearLog();
      setLive();
      if (m === "lobby") {
        if (!autoOn) startAuto();
        bubble("📺 Домера", "Лобби: пишем текстом, иногда 🎙 войс. Пиши — ответим, потом орём друг другу.", "yt", "text");
        setTimeout(function () {
          bubble("🧒 Миша, 8", "И про день, и про игры — болтаем без конца 😂", "kid", "text");
        }, 600);
      } else if (m === "support") {
        stopAuto();
        if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (_) {}
        speakQueue = [];
        bubble("🛟 Поддержка Blue Cat", "Привет! Я ИИ-поддержка сайта. Спроси про вход, отзывы, почему другие не видят сообщения, игры.", "support", "text");
      } else {
        stopAuto();
        if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (_) {}
        speakQueue = [];
        renderPlayers();
      }
    }

    function send() {
      const text = String((input && input.value) || "").trim();
      if (!text) return;
      if (input) input.value = "";
      if (mode === "support") {
        bubble("👤 " + userNick(), text, "me", "text");
        setTimeout(function () {
          bubble("🛟 Поддержка Blue Cat", supportAnswer(text), "support", "text");
        }, 400);
        return;
      }
      if (mode === "players") {
        sendPlayers(text);
        return;
      }
      // lobby
      bubble("👤 " + userNick(), text, "me", "text");
      replyToUser(text);
    }

    if (sendBtn) sendBtn.addEventListener("click", send);
    if (input)
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          send();
        }
      });
    if (autoBtn)
      autoBtn.addEventListener("click", function () {
        if (mode !== "lobby") return;
        if (autoOn) {
          stopAuto();
          toast("Авто-чат на паузе");
        } else {
          startAuto();
          toast("Снова болтают");
          autoTick();
        }
      });
    if (voiceBtn)
      voiceBtn.addEventListener("click", function () {
        // диктор полностью выкл — кнопка только гасит TTS
        voiceOn = false;
        stopDictor();
        setLive();
        toast("Диктор выключен");
      });

    function startMic() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        toast("Нужен Chrome/Edge для микрофона");
        return;
      }
      if (!recognition) {
        recognition = new SR();
        recognition.lang = "ru-RU";
        recognition.continuous = false;
        recognition.onresult = function (ev) {
          let t = "";
          try {
            t = ev.results[0][0].transcript;
          } catch (_) {}
          t = String(t || "").trim();
          if (t && input) {
            input.value = t;
            send();
          }
          micOn = false;
          setLive();
        };
        recognition.onerror = function () {
          micOn = false;
          setLive();
        };
        recognition.onend = function () {
          micOn = false;
          setLive();
        };
      }
      micOn = true;
      setLive();
      try {
        recognition.start();
        toast("🎤 Говори…");
      } catch (_) {
        micOn = false;
        setLive();
      }
    }
    if (micBtn)
      micBtn.addEventListener("click", function () {
        if (micOn) {
          try {
            recognition && recognition.stop();
          } catch (_) {}
          micOn = false;
          setLive();
        } else startMic();
      });

    if (tabLobby) tabLobby.addEventListener("click", function () { switchMode("lobby"); });
    if (tabSupport) tabSupport.addEventListener("click", function () { switchMode("support"); });
    if (tabPlayers) tabPlayers.addEventListener("click", function () { switchMode("players"); });

    // сразу гасим диктор при открытии
    stopDictor();
    if (window.speechSynthesis) {
      try {
        speechSynthesis.cancel();
      } catch (_) {}
    }

    // default: open lobby OR support if hash
    const hash = (location.hash || "").toLowerCase();
    if (hash.indexOf("support") >= 0 || hash === "#chat") switchMode("support");
    else switchMode("lobby");
    if (mode === "lobby") startAuto();
  });
})();

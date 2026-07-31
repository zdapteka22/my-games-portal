/**
 * Invite a friend into the current mini-game (or enable local 2P).
 * Include in games: <script src="../../invite-friend.js"></script>
 * Call: InviteFriend.open({ gameId, gameTitle, onLocal2P })
 */
(function (w) {
  const SOCIAL_DEFAULT = "https://jsonblob.com/api/jsonBlob/019fb377-162c-714b-a879-ede7cb9e1428";
  const FRIENDS_KEY = "portal_friends_v1";
  const USER_KEY = "portal_user_v1";
  let socialUrl = SOCIAL_DEFAULT;
  let opts = { gameId: "snake", gameTitle: "Игра", onLocal2P: null };

  function loadFriends() {
    try {
      const a = JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (_) {
      return [];
    }
  }
  function loadUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  async function loadConfig() {
    try {
      const r = await fetch("../../data/reviews-config.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j && j.socialUrl) socialUrl = String(j.socialUrl);
      }
    } catch (_) {
      try {
        const r2 = await fetch("/my-games-portal/data/reviews-config.json?v=" + Date.now(), { cache: "no-store" });
        if (r2.ok) {
          const j = await r2.json();
          if (j && j.socialUrl) socialUrl = String(j.socialUrl);
        }
      } catch (_) {}
    }
  }

  async function cloudGet() {
    await loadConfig();
    try {
      const r = await fetch(socialUrl, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch (_) {
      return [];
    }
  }

  async function cloudPut(list) {
    await loadConfig();
    try {
      const r = await fetch(socialUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
        body: JSON.stringify((list || []).slice(0, 300))
      });
      return r.ok;
    } catch (_) {
      return false;
    }
  }

  async function sendInvite(toName) {
    const user = loadUser();
    if (!user) {
      alert("Сначала войди на главной странице портала — иначе друг не увидит приглашение.");
      return false;
    }
    const clean = String(toName || "").trim().slice(0, 40);
    if (!clean) {
      alert("Напиши имя друга");
      return false;
    }
    const ev = {
      id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      type: "invite",
      status: "pending",
      fromId: String(user.id || ""),
      fromName: String(user.name || "Игрок").slice(0, 40),
      toId: "",
      toName: clean,
      toNameNorm: clean.toLowerCase(),
      gameId: String(opts.gameId || "snake"),
      gameTitle: String(opts.gameTitle || "Игра").slice(0, 60),
      date: new Date().toISOString()
    };
    const list = await cloudGet();
    const byId = {};
    list.forEach(function (x) {
      if (x && x.id) byId[x.id] = x;
    });
    byId[ev.id] = ev;
    const merged = Object.keys(byId).map(function (k) {
      return byId[k];
    });
    const ok = await cloudPut(merged);
    if (!ok) {
      alert("Облако не ответило — приглашение не ушло. Попробуй ещё раз.");
      return false;
    }
    alert("Приглашение отправлено «" + clean + "» в «" + opts.gameTitle + "».\nДруг: вкладка «Заявки» → Обновить → Играть.");
    return true;
  }

  function ensureModal() {
    let m = document.getElementById("inviteFriendModal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "inviteFriendModal";
    m.setAttribute("hidden", "");
    m.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:16px";
    m.innerHTML =
      '<div style="width:min(420px,100%);background:#141414;border:2px solid #ffcc00;border-radius:16px;padding:18px;color:#fff;font-family:Segoe UI,Arial,sans-serif">' +
      '<h3 style="margin:0 0 8px;font-size:18px">🤝 С другом</h3>' +
      '<p id="inviteFriendGame" style="margin:0 0 12px;color:#bbb;font-size:13px"></p>' +
      '<div id="inviteFriendList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:180px;overflow:auto"></div>' +
      '<label style="display:block;font-size:13px;margin-bottom:6px;color:#ccc">Или имя друга</label>' +
      '<input id="inviteFriendName" type="text" maxlength="40" placeholder="Ник друга" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;font:inherit;margin-bottom:12px;box-sizing:border-box">' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
      '<button type="button" id="inviteFriendSend" style="height:42px;padding:0 14px;border-radius:999px;border:none;background:linear-gradient(135deg,#ffcc00,#ff9f1c);color:#2a1200;font-weight:800;cursor:pointer">📩 Пригласить</button>' +
      '<button type="button" id="inviteFriendLocal" style="height:42px;padding:0 14px;border-radius:999px;border:1px solid #555;background:#222;color:#fff;font-weight:800;cursor:pointer">👥 2 игрока здесь</button>' +
      '<button type="button" id="inviteFriendClose" style="height:42px;padding:0 14px;border-radius:999px;border:1px solid #555;background:#1a1a1a;color:#ddd;font-weight:800;cursor:pointer">Закрыть</button>' +
      "</div></div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m) close();
    });
    document.getElementById("inviteFriendClose").onclick = close;
    document.getElementById("inviteFriendSend").onclick = async function () {
      const name = document.getElementById("inviteFriendName").value;
      const ok = await sendInvite(name);
      if (ok) close();
    };
    document.getElementById("inviteFriendLocal").onclick = function () {
      close();
      if (typeof opts.onLocal2P === "function") opts.onLocal2P();
      else {
        const u = new URL(location.href);
        u.searchParams.set("mode", "2");
        location.href = u.toString();
      }
    };
    return m;
  }

  function open(options) {
    opts = Object.assign({ gameId: "snake", gameTitle: "Игра", onLocal2P: null }, options || {});
    const m = ensureModal();
    m.hidden = false;
    m.style.display = "grid";
    document.getElementById("inviteFriendGame").textContent =
      "Игра: " + opts.gameTitle + " · выбери друга или 2 игрока на этом устройстве";
    const list = document.getElementById("inviteFriendList");
    const friends = loadFriends();
    if (!friends.length) {
      list.innerHTML =
        '<p style="margin:0;color:#888;font-size:13px">Друзей пока нет — впиши ник вручную или добавь во вкладке «Друзья» на сайте.</p>';
    } else {
      list.innerHTML = friends
        .slice(0, 20)
        .map(function (f) {
          const name = String(f.name || "").replace(/"/g, "");
          return (
            '<button type="button" data-pick-friend="' +
            name.replace(/&/g, "&amp;").replace(/"/g, "&quot;") +
            '" style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid #333;background:#1a1a1a;color:#fff;font-weight:700;cursor:pointer">' +
            "👤 " +
            name +
            "</button>"
          );
        })
        .join("");
      list.querySelectorAll("[data-pick-friend]").forEach(function (btn) {
        btn.onclick = async function () {
          const name = btn.getAttribute("data-pick-friend");
          document.getElementById("inviteFriendName").value = name;
          const ok = await sendInvite(name);
          if (ok) close();
        };
      });
    }
    document.getElementById("inviteFriendName").value = "";
    document.getElementById("inviteFriendName").focus();
  }

  function close() {
    const m = document.getElementById("inviteFriendModal");
    if (m) {
      m.hidden = true;
      m.style.display = "none";
    }
  }

  function wireButton(el, options) {
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      open(options);
    });
  }

  w.InviteFriend = { open: open, close: close, wireButton: wireButton, sendInvite: sendInvite };
})(window);

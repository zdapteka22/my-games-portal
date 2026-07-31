/**
 * Friend requests + invites.
 * Pending friend_requests are listed in tab «Заявки» for every logged-in user
 * (so the other account always sees them). Invites still prefer name match.
 */
(function (w) {
  const LOCAL_KEY = "portal_social_inbox_v1";
  const SEEN_KEY = "portal_social_seen_v1";
  const OUT_KEY = "portal_social_out_v1";
  const DEFAULT_URL = "https://jsonblob.com/api/jsonBlob/019fb377-162c-714b-a879-ede7cb9e1428";
  let socialUrl = DEFAULT_URL;
  let pollTimer = null;

  function me() {
    try {
      return JSON.parse(localStorage.getItem("portal_user_v1") || "null");
    } catch (_) {
      return null;
    }
  }

  function normName(s) {
    return String(s || "")
      .replace(/[✍️🧒👧👪📺🎬🤖🎮👤📩🔔]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function loadInbox() {
    try {
      const a = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (_) {
      return [];
    }
  }
  function saveInbox(list) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify((list || []).slice(0, 200)));
    } catch (_) {}
  }
  function loadSeen() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }
  function markSeen(id) {
    const s = loadSeen();
    s[id] = 1;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(s));
    } catch (_) {}
  }
  function loadOut() {
    try {
      const a = JSON.parse(localStorage.getItem(OUT_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (_) {
      return [];
    }
  }
  function saveOut(list) {
    try {
      localStorage.setItem(OUT_KEY, JSON.stringify((list || []).slice(0, 80)));
    } catch (_) {}
  }

  async function loadConfig() {
    try {
      const r = await fetch("data/reviews-config.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j && j.socialUrl) socialUrl = String(j.socialUrl);
      }
    } catch (_) {}
  }

  function parseList(j) {
    if (Array.isArray(j)) return j;
    if (j && Array.isArray(j.events)) return j.events;
    return [];
  }

  async function cloudGet() {
    await loadConfig();
    try {
      const r = await fetch(socialUrl, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!r.ok) return [];
      return parseList(await r.json());
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

  async function publishEvent(ev) {
    const list = await cloudGet();
    const byId = {};
    list.forEach(function (x) {
      if (x && x.id) byId[x.id] = x;
    });
    byId[ev.id] = ev;
    const merged = Object.keys(byId)
      .map(function (k) {
        return byId[k];
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
    const ok = await cloudPut(merged);
    const inbox = loadInbox();
    const map = {};
    inbox.forEach(function (x) {
      if (x && x.id) map[x.id] = x;
    });
    map[ev.id] = ev;
    saveInbox(
      Object.keys(map).map(function (k) {
        return map[k];
      })
    );
    try {
      if (w.BroadcastChannel) {
        const bc = new BroadcastChannel("bluecat_social");
        bc.postMessage({ type: "social", ev: ev });
        bc.close();
      }
    } catch (_) {}
    return ok;
  }

  function matchTarget(ev, user) {
    if (!ev || !user) return false;
    const toId = String(ev.toId || "");
    const myId = String(user.id || "");
    if (toId && myId && toId === myId) return true;
    const toName = normName(ev.toName);
    const myName = normName(user.name);
    if (toName && myName && (toName === myName || toName.indexOf(myName) !== -1 || myName.indexOf(toName) !== -1)) {
      return true;
    }
    return false;
  }

  function matchFrom(ev, user) {
    if (!ev || !user) return false;
    const fromId = String(ev.fromId || "");
    const myId = String(user.id || "");
    if (fromId && myId && fromId === myId) return true;
    return normName(ev.fromName) === normName(user.name);
  }

  /** Incoming friend requests: ALL pending (board) so other account always sees them */
  function pendingFriendRequests() {
    const byId = {};
    loadInbox().forEach(function (ev) {
      if (ev && ev.type === "friend_request" && (!ev.status || ev.status === "pending") && ev.id) {
        byId[ev.id] = ev;
      }
    });
    return Object.keys(byId)
      .map(function (k) {
        return byId[k];
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }

  function pendingInvitesForMe(user) {
    if (!user) return [];
    return loadInbox()
      .filter(function (ev) {
        return ev && ev.type === "invite" && (!ev.status || ev.status === "pending") && matchTarget(ev, user);
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }

  function myOutgoing(user) {
    if (!user) return [];
    return loadInbox()
      .filter(function (ev) {
        return (
          ev &&
          (ev.type === "friend_request" || ev.type === "invite") &&
          (!ev.status || ev.status === "pending") &&
          matchFrom(ev, user)
        );
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }

  function resultsForMe(user) {
    if (!user) return [];
    return loadInbox()
      .filter(function (ev) {
        return ev && (ev.type === "friend_result" || ev.type === "invite_result") && matchTarget(ev, user);
      })
      .slice(0, 20);
  }

  function relevantForBell(ev, user) {
    if (!ev || !user) return false;
    if (ev.type === "friend_request" && (!ev.status || ev.status === "pending")) {
      // bell: highlight if addressed to me OR any pending (so user notices)
      return matchTarget(ev, user) || true;
    }
    if (ev.type === "invite" && (!ev.status || ev.status === "pending")) return matchTarget(ev, user);
    if (ev.type === "friend_result" || ev.type === "invite_result") return matchTarget(ev, user);
    return false;
  }

  function myNotifications(user) {
    if (!user) return [];
    const byId = {};
    loadInbox().forEach(function (ev) {
      if (relevantForBell(ev, user)) byId[ev.id] = ev;
    });
    return Object.keys(byId)
      .map(function (k) {
        return byId[k];
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      })
      .slice(0, 40);
  }

  function unreadCount(user) {
    if (!user) return 0;
    const seen = loadSeen();
    const incoming = pendingFriendRequests().concat(pendingInvitesForMe(user));
    return incoming.filter(function (ev) {
      return ev && ev.id && !seen[ev.id] && !matchFrom(ev, user);
    }).length;
  }

  async function refreshFromCloud() {
    const cloud = await cloudGet();
    const byId = {};
    loadInbox().forEach(function (ev) {
      if (ev && ev.id) byId[ev.id] = ev;
    });
    cloud.forEach(function (ev) {
      if (ev && ev.id) byId[ev.id] = ev;
    });
    const merged = Object.keys(byId).map(function (k) {
      return byId[k];
    });
    saveInbox(merged);
    renderUI();
    return merged;
  }

  function ensureLogin() {
    const user = me();
    if (!user) {
      if (typeof w.toast === "function") w.toast("Сначала войди");
      const btn = document.getElementById("loginBtn");
      if (btn) btn.click();
      return null;
    }
    return user;
  }

  async function sendFriendRequest(toName, phone) {
    const user = ensureLogin();
    if (!user) return { ok: false };
    const clean = String(toName || "").trim().slice(0, 40);
    if (!clean) return { ok: false };
    if (normName(user.name) === normName(clean)) {
      if (typeof w.toast === "function") w.toast("Нельзя добавить себя");
      return { ok: false };
    }
    const ev = {
      id: "fr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      type: "friend_request",
      status: "pending",
      fromId: String(user.id || ""),
      fromName: String(user.name || "Игрок").slice(0, 40),
      toId: "",
      toName: clean,
      toNameNorm: normName(clean),
      phone: String(phone || "").trim().slice(0, 20),
      date: new Date().toISOString()
    };
    const out = loadOut();
    out.unshift(ev);
    saveOut(out);
    const ok = await publishEvent(ev);
    if (typeof w.toast === "function") {
      w.toast(
        ok
          ? "Заявка ушла в облако → на другом аккаунте открой вкладку «Заявки»"
          : "Облако не ответило — заявка только здесь"
      );
    }
    renderUI();
    openRequestsTab();
    return { ok: true, ev: ev, shared: ok };
  }

  async function sendInvite(toName, gameId, gameTitle) {
    const user = ensureLogin();
    if (!user) return { ok: false };
    const clean = String(toName || "").trim().slice(0, 40);
    if (!clean) return { ok: false };
    const ev = {
      id: "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      type: "invite",
      status: "pending",
      fromId: String(user.id || ""),
      fromName: String(user.name || "Игрок").slice(0, 40),
      toId: "",
      toName: clean,
      toNameNorm: normName(clean),
      gameId: String(gameId || "battle"),
      gameTitle: String(gameTitle || "Битва всех игр").slice(0, 60),
      date: new Date().toISOString()
    };
    const out = loadOut();
    out.unshift(ev);
    saveOut(out);
    const ok = await publishEvent(ev);
    if (typeof w.toast === "function") {
      w.toast(ok ? "Приглашение в «Заявки» у друга" : "Приглашение сохранено локально");
    }
    renderUI();
    return { ok: true, ev: ev, shared: ok };
  }

  async function respond(evId, accept) {
    const user = me();
    if (!user) {
      ensureLogin();
      return;
    }
    let inbox = loadInbox();
    let ev = inbox.find(function (x) {
      return x && x.id === evId;
    });
    if (!ev) {
      await refreshFromCloud();
      inbox = loadInbox();
      ev = inbox.find(function (x) {
        return x && x.id === evId;
      });
    }
    if (!ev) return;
    if (matchFrom(ev, user) && (ev.type === "friend_request" || ev.type === "invite")) {
      if (typeof w.toast === "function") w.toast("Это твоя исходящая заявка");
      return;
    }
    markSeen(evId);
    ev.status = accept ? "accepted" : "declined";
    saveInbox(inbox);

    if (ev.type === "friend_request" && accept) {
      if (typeof w.addFriendConfirmed === "function") {
        w.addFriendConfirmed(ev.fromName, ev.phone || "");
      }
    }

    const result = {
      id: "res_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type: ev.type === "invite" ? "invite_result" : "friend_result",
      status: accept ? "accepted" : "declined",
      fromId: String(user.id || ""),
      fromName: String(user.name || "Игрок").slice(0, 40),
      toId: String(ev.fromId || ""),
      toName: String(ev.fromName || "").slice(0, 40),
      gameId: ev.gameId || "",
      gameTitle: ev.gameTitle || "",
      relatedId: ev.id,
      date: new Date().toISOString()
    };
    await publishEvent(result);

    const cloud = await cloudGet();
    const updated = cloud.map(function (x) {
      if (x && x.id === ev.id) x.status = ev.status;
      return x;
    });
    await cloudPut(updated);

    if (ev.type === "invite" && accept) {
      location.href = "play.html?id=" + encodeURIComponent(ev.gameId || "battle") + "&mode=2&invite=1";
      return;
    }
    if (typeof w.toast === "function") w.toast(accept ? "Принято ✓" : "Отклонено");
    renderUI();
  }

  function labelFor(ev) {
    if (!ev) return "";
    if (ev.type === "friend_request") {
      return "👤 " + (ev.fromName || "Игрок") + " → «" + (ev.toName || "?") + "»: хочет в друзья";
    }
    if (ev.type === "invite") {
      return "🎮 " + (ev.fromName || "Игрок") + " приглашает «" + (ev.toName || "") + "» в «" + (ev.gameTitle || "игру") + "»";
    }
    if (ev.type === "friend_result") {
      return ev.status === "accepted"
        ? "✅ " + (ev.fromName || "Игрок") + " принял(а) заявку в друзья"
        : "✖️ " + (ev.fromName || "Игрок") + " отклонил(а) заявку";
    }
    if (ev.type === "invite_result") {
      return ev.status === "accepted"
        ? "✅ " + (ev.fromName || "Игрок") + " принял(а) приглашение"
        : "✖️ " + (ev.fromName || "Игрок") + " отклонил(а) приглашение";
    }
    return "Уведомление";
  }

  function cardHtml(ev, user, mode) {
    const pending = !ev.status || ev.status === "pending";
    const mineOut = matchFrom(ev, user);
    const forMe = matchTarget(ev, user);
    let actions = "";
    if (pending && !mineOut && (ev.type === "friend_request" || (ev.type === "invite" && forMe))) {
      actions =
        "<div class='notif-actions'>" +
        "<button type='button' class='btn-play' data-notif-accept='" +
        ev.id +
        "'>Принять</button>" +
        "<button type='button' class='btn-secondary' data-notif-decline='" +
        ev.id +
        "'>Отклонить</button>" +
        "</div>";
    } else if (pending && mineOut) {
      actions = "<div class='notif-actions'><span style='color:#8ac;font-size:12px'>Исходящая · ждём ответ</span></div>";
    } else {
      actions =
        "<div class='notif-actions'><button type='button' class='btn-secondary' data-notif-seen='" +
        ev.id +
        "'>Ок</button></div>";
    }
    const hint =
      ev.type === "friend_request" && pending && !mineOut
        ? "<div style='color:#888;font-size:11px;margin-top:4px'>Кому: " +
          esc(ev.toName || "—") +
          (forMe ? " · это тебе" : " · прими, если это ты") +
          "</div>"
        : "";
    return (
      "<article class='notif-item" +
      (forMe && pending ? " unread" : "") +
      "' data-id='" +
      esc(ev.id) +
      "'>" +
      "<p>" +
      esc(labelFor(ev)) +
      "</p>" +
      hint +
      "<time>" +
      esc(String(ev.date || "").replace("T", " ").slice(0, 16)) +
      "</time>" +
      actions +
      "</article>"
    );
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRequestsTab() {
    const box = document.getElementById("requestsList");
    const badge = document.getElementById("requestsTabBadge");
    const user = me();
    const n = unreadCount(user);
    if (badge) {
      badge.hidden = n < 1;
      badge.textContent = String(n > 9 ? "9+" : n);
    }
    if (!box) return;
    if (!user) {
      box.innerHTML = "<p class='notif-empty'>Войди — тогда увидишь заявки от других аккаунтов.</p>";
      return;
    }
    const incomingFr = pendingFriendRequests().filter(function (ev) {
      return !matchFrom(ev, user);
    });
    const invites = pendingInvitesForMe(user);
    const outgoing = myOutgoing(user);
    const results = resultsForMe(user);

    let html = "";
    html += "<h4 style='margin:0 0 8px;color:#9ad4ff'>📥 Входящие заявки в друзья</h4>";
    if (!incomingFr.length) {
      html += "<p class='notif-empty'>Пока пусто. Когда кто-то кинет заявку — она появится здесь на любом аккаунте.</p>";
    } else {
      html += incomingFr.map(function (ev) {
        return cardHtml(ev, user, "in");
      }).join("");
    }

    html += "<h4 style='margin:16px 0 8px;color:#9ad4ff'>🎮 Приглашения в игру</h4>";
    if (!invites.length) html += "<p class='notif-empty'>Нет приглашений на твой ник.</p>";
    else {
      html += invites.map(function (ev) {
        return cardHtml(ev, user, "inv");
      }).join("");
    }

    html += "<h4 style='margin:16px 0 8px;color:#aaa'>📤 Мои исходящие</h4>";
    if (!outgoing.length) html += "<p class='notif-empty'>Ты ещё никому не кидал заявку.</p>";
    else {
      html += outgoing.map(function (ev) {
        return cardHtml(ev, user, "out");
      }).join("");
    }

    if (results.length) {
      html += "<h4 style='margin:16px 0 8px;color:#aaa'>Ответы</h4>";
      html += results.map(function (ev) {
        return cardHtml(ev, user, "res");
      }).join("");
    }

    box.innerHTML = html;
  }

  function renderBell() {
    const user = me();
    const badge = document.getElementById("notifBadge");
    const listEl = document.getElementById("notifList");
    const n = unreadCount(user);
    if (badge) {
      badge.hidden = n < 1;
      badge.textContent = String(n > 9 ? "9+" : n);
    }
    if (!listEl) return;
    if (!user) {
      listEl.innerHTML = "<p class='notif-empty'>Войди, чтобы видеть заявки.</p>";
      return;
    }
    const items = pendingFriendRequests()
      .filter(function (ev) {
        return !matchFrom(ev, user);
      })
      .concat(pendingInvitesForMe(user))
      .concat(resultsForMe(user))
      .slice(0, 25);
    if (!items.length) {
      listEl.innerHTML = "<p class='notif-empty'>Пусто. Открой вкладку «Заявки».</p>";
      return;
    }
    listEl.innerHTML = items
      .map(function (ev) {
        return cardHtml(ev, user, "bell");
      })
      .join("");
  }

  function renderUI() {
    renderBell();
    renderRequestsTab();
  }

  function openRequestsTab() {
    const tab = document.querySelector('.tab[data-tab="requests"]');
    if (tab) tab.click();
  }

  function togglePanel(force) {
    const panel = document.getElementById("notifPanel");
    if (!panel) return;
    if (typeof force === "boolean") panel.hidden = !force;
    else panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      refreshFromCloud();
      renderUI();
    }
  }

  function wire() {
    const bell = document.getElementById("notifBell");
    if (bell && !bell.getAttribute("data-wired")) {
      bell.setAttribute("data-wired", "1");
      bell.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      });
    }
    const refreshBtn = document.getElementById("requestsRefreshBtn");
    if (refreshBtn && !refreshBtn.getAttribute("data-wired")) {
      refreshBtn.setAttribute("data-wired", "1");
      refreshBtn.addEventListener("click", function () {
        refreshFromCloud().then(function () {
          if (typeof w.toast === "function") w.toast("Заявки обновлены");
        });
      });
    }
    document.addEventListener("click", function (e) {
      const acc = e.target.closest && e.target.closest("[data-notif-accept]");
      const dec = e.target.closest && e.target.closest("[data-notif-decline]");
      const seenBtn = e.target.closest && e.target.closest("[data-notif-seen]");
      if (acc) {
        e.preventDefault();
        respond(acc.getAttribute("data-notif-accept"), true);
      } else if (dec) {
        e.preventDefault();
        respond(dec.getAttribute("data-notif-decline"), false);
      } else if (seenBtn) {
        e.preventDefault();
        markSeen(seenBtn.getAttribute("data-notif-seen"));
        renderUI();
      } else {
        const panel = document.getElementById("notifPanel");
        if (panel && !panel.hidden && !e.target.closest("#notifPanel") && !e.target.closest("#notifBell")) {
          panel.hidden = true;
        }
      }
      const inv = e.target.closest && e.target.closest("[data-invite]");
      if (inv) {
        e.preventDefault();
        const name = inv.getAttribute("data-invite");
        const gid = inv.getAttribute("data-invite-game") || "snake";
        const titles = {
          snake: "Змейка",
          tanks: "Танчики",
          pacman: "Пакман",
          labyrinth: "Лабиринт",
          mario: "Марио",
          battle: "Битва всех игр",
          smeshariki: "Смешарики"
        };
        sendInvite(name, gid, titles[gid] || gid);
      }
    });
    try {
      if (w.BroadcastChannel) {
        const bc = new BroadcastChannel("bluecat_social");
        bc.onmessage = function (msg) {
          if (msg && msg.data && msg.data.ev) {
            const inbox = loadInbox();
            inbox.unshift(msg.data.ev);
            saveInbox(inbox);
            renderUI();
          }
        };
      }
    } catch (_) {}
  }

  function start() {
    wire();
    renderUI();
    refreshFromCloud();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      refreshFromCloud();
    }, 8000);
  }

  w.PortalSocial = {
    sendFriendRequest: sendFriendRequest,
    sendInvite: sendInvite,
    refresh: refreshFromCloud,
    render: renderUI,
    start: start,
    togglePanel: togglePanel,
    openRequestsTab: openRequestsTab
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    setTimeout(start, 200);
  }
})(window);

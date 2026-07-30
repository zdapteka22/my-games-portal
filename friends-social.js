/**
 * Friend requests + game invites with notifications (cloud jsonblob + local).
 * Depends on: loadUser, toast, addFriendConfirmed (window hooks from index.html)
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
      localStorage.setItem(LOCAL_KEY, JSON.stringify((list || []).slice(0, 120)));
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify((list || []).slice(0, 300))
      });
      return r.ok;
    } catch (_) {
      return false;
    }
  }

  async function publishEvent(ev) {
    const list = await cloudGet();
    const without = list.filter(function (x) {
      return !x || String(x.id) !== String(ev.id);
    });
    without.unshift(ev);
    const ok = await cloudPut(without);
    const inbox = loadInbox();
    inbox.unshift(ev);
    saveInbox(inbox);
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
    const toName = String(ev.toName || "").trim().toLowerCase();
    const myId = String(user.id || "");
    const myName = String(user.name || "").trim().toLowerCase();
    if (toId && myId && toId === myId) return true;
    if (toName && myName && toName === myName) return true;
    return false;
  }

  function matchFrom(ev, user) {
    if (!ev || !user) return false;
    const fromId = String(ev.fromId || "");
    const fromName = String(ev.fromName || "").trim().toLowerCase();
    const myId = String(user.id || "");
    const myName = String(user.name || "").trim().toLowerCase();
    if (fromId && myId && fromId === myId) return true;
    if (fromName && myName && fromName === myName) return true;
    return false;
  }

  function relevantForMe(ev, user) {
    if (!ev || !user) return false;
    if (ev.status && ev.status !== "pending") {
      // accepted/declined replies go to sender
      if (ev.type === "friend_result" || ev.type === "invite_result") return matchTarget(ev, user);
      return false;
    }
    if (ev.type === "friend_request" || ev.type === "invite") return matchTarget(ev, user);
    if (ev.type === "friend_result" || ev.type === "invite_result") return matchTarget(ev, user);
    return false;
  }

  function unreadCount(user) {
    const seen = loadSeen();
    return myNotifications(user).filter(function (ev) {
      return ev && ev.id && !seen[ev.id];
    }).length;
  }

  function myNotifications(user) {
    if (!user) return [];
    const byId = {};
    loadInbox().concat([]).forEach(function (ev) {
      if (relevantForMe(ev, user)) byId[ev.id] = ev;
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

  async function refreshFromCloud() {
    const user = me();
    const cloud = await cloudGet();
    const inbox = loadInbox();
    const byId = {};
    inbox.forEach(function (ev) {
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
      if (typeof w.toast === "function") w.toast("Сначала войди — чтобы слать заявки и получать уведомления");
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
    if (String(user.name || "").trim().toLowerCase() === clean.toLowerCase()) {
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
      phone: String(phone || "").trim().slice(0, 20),
      date: new Date().toISOString()
    };
    const out = loadOut();
    out.unshift(ev);
    saveOut(out);
    const ok = await publishEvent(ev);
    if (typeof w.toast === "function") {
      w.toast(ok ? "Заявка отправлена «" + clean + "» — жди ответ" : "Заявка сохранена (облако недоступно) — на этом ПК увидит, если войдёт под этим именем");
    }
    renderUI();
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
      gameId: String(gameId || "battle"),
      gameTitle: String(gameTitle || "Битва всех игр").slice(0, 60),
      date: new Date().toISOString()
    };
    const out = loadOut();
    out.unshift(ev);
    saveOut(out);
    const ok = await publishEvent(ev);
    if (typeof w.toast === "function") {
      w.toast(ok ? "Приглашение отправлено «" + clean + "»" : "Приглашение сохранено локально");
    }
    renderUI();
    return { ok: true, ev: ev, shared: ok };
  }

  async function respond(evId, accept) {
    const user = me();
    if (!user) return;
    const inbox = loadInbox();
    const ev = inbox.find(function (x) {
      return x && x.id === evId;
    });
    if (!ev) return;
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

    // update original in cloud
    const cloud = await cloudGet();
    const updated = cloud.map(function (x) {
      if (x && x.id === ev.id) {
        x.status = ev.status;
      }
      return x;
    });
    await cloudPut(updated);

    if (ev.type === "invite" && accept) {
      const gid = ev.gameId || "battle";
      location.href = "play.html?id=" + encodeURIComponent(gid) + "&mode=2&invite=1";
      return;
    }
    if (typeof w.toast === "function") {
      w.toast(accept ? "Принято ✓" : "Отклонено");
    }
    renderUI();
  }

  function labelFor(ev) {
    if (!ev) return "";
    if (ev.type === "friend_request") {
      return "👤 " + (ev.fromName || "Игрок") + " хочет добавить вас в друзья";
    }
    if (ev.type === "invite") {
      return "🎮 " + (ev.fromName || "Игрок") + " приглашает в «" + (ev.gameTitle || "игру") + "»";
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

  function renderUI() {
    const user = me();
    const badge = document.getElementById("notifBadge");
    const listEl = document.getElementById("notifList");
    const n = user ? unreadCount(user) : 0;
    if (badge) {
      badge.hidden = n < 1;
      badge.textContent = String(n > 9 ? "9+" : n);
    }
    if (!listEl) return;
    if (!user) {
      listEl.innerHTML = "<p class='notif-empty'>Войди, чтобы видеть заявки и приглашения.</p>";
      return;
    }
    const items = myNotifications(user);
    if (!items.length) {
      listEl.innerHTML = "<p class='notif-empty'>Пока нет уведомлений.</p>";
      return;
    }
    const seen = loadSeen();
    listEl.innerHTML = items
      .map(function (ev) {
        const pending = !ev.status || ev.status === "pending";
        const isReq = ev.type === "friend_request" || ev.type === "invite";
        const unread = !seen[ev.id] ? " unread" : "";
        let actions = "";
        if (pending && isReq) {
          actions =
            "<div class='notif-actions'>" +
            "<button type='button' class='btn-play' data-notif-accept='" +
            ev.id +
            "'>Принять</button>" +
            "<button type='button' class='btn-secondary' data-notif-decline='" +
            ev.id +
            "'>Отклонить</button>" +
            "</div>";
        } else {
          actions =
            "<div class='notif-actions'><button type='button' class='btn-secondary' data-notif-seen='" +
            ev.id +
            "'>Ок</button></div>";
        }
        return (
          "<article class='notif-item" +
          unread +
          "' data-id='" +
          ev.id +
          "'>" +
          "<p>" +
          labelFor(ev) +
          "</p>" +
          "<time>" +
          String(ev.date || "").replace("T", " ").slice(0, 16) +
          "</time>" +
          actions +
          "</article>"
        );
      })
      .join("");
  }

  function togglePanel(force) {
    const panel = document.getElementById("notifPanel");
    if (!panel) return;
    if (typeof force === "boolean") panel.hidden = !force;
    else panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      refreshFromCloud();
      const user = me();
      myNotifications(user).forEach(function (ev) {
        if (ev && ev.id && (ev.type === "friend_result" || ev.type === "invite_result")) markSeen(ev.id);
      });
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
        const bell2 = document.getElementById("notifBell");
        if (panel && !panel.hidden && !e.target.closest("#notifPanel") && !e.target.closest("#notifBell")) {
          panel.hidden = true;
        }
      }
      const inv = e.target.closest && e.target.closest("[data-invite]");
      if (inv) {
        e.preventDefault();
        const name = inv.getAttribute("data-invite");
        sendInvite(name, "battle", "Битва всех игр");
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
    }, 10000);
  }

  w.PortalSocial = {
    sendFriendRequest: sendFriendRequest,
    sendInvite: sendInvite,
    refresh: refreshFromCloud,
    render: renderUI,
    start: start,
    togglePanel: togglePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    setTimeout(start, 200);
  }
})(window);

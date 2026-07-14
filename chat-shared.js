/* Shared chat rooms for Blue Cat portal.
 * Rooms: support | lobby | game:<id>
 * Local + optional cloud (same crudcrud host as reviews).
 */
(function (w) {
  const LOCAL_KEY = "portal_chat_msgs_v1";
  const DEFAULT_CLOUD = "https://crudcrud.com/api/69a6d57b5d794a17abf2b3ee0069358f/chats";
  let cloudUrl = DEFAULT_CLOUD;

  function loadAll() {
    try {
      const o = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }
  function saveAll(map) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function loadRoom(room) {
    const map = loadAll();
    const list = map[room];
    return Array.isArray(list) ? list : [];
  }

  function pushLocal(room, msg) {
    const map = loadAll();
    if (!Array.isArray(map[room])) map[room] = [];
    map[room].unshift(msg);
    map[room] = map[room].slice(0, 200);
    saveAll(map);
    try {
      if (w.BroadcastChannel) {
        const bc = new BroadcastChannel("bluecat_chat");
        bc.postMessage({ room: room, msg: msg });
        bc.close();
      }
    } catch (_) {}
  }

  async function loadCloudConfig() {
    try {
      const r = await fetch("data/reviews-config.json", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j && j.chatUrl) cloudUrl = String(j.chatUrl);
        else if (j && j.sharedUrl) {
          // derive chats from reviews base if same crudcrud
          const u = String(j.sharedUrl);
          cloudUrl = u.replace(/\/reviews\/?$/, "/chats");
          if (cloudUrl === u) cloudUrl = DEFAULT_CLOUD;
        }
      }
    } catch (_) {}
  }

  async function fetchCloud(room) {
    await loadCloudConfig();
    try {
      const res = await fetch(cloudUrl, { cache: "no-store" });
      if (!res.ok) return [];
      const arr = await res.json();
      if (!Array.isArray(arr)) return [];
      return arr
        .map(function (m) {
          return {
            id: m.id || m._id || ("c_" + Math.random().toString(36).slice(2)),
            room: m.room || "lobby",
            who: String(m.who || "Игрок").slice(0, 40),
            text: String(m.text || "").slice(0, 400),
            kind: m.kind === "voice" ? "voice" : "text",
            role: m.role || "user",
            date: m.date || "",
            shared: true
          };
        })
        .filter(function (m) {
          return m.room === room && m.text;
        })
        .sort(function (a, b) {
          return String(b.date).localeCompare(String(a.date));
        })
        .slice(0, 150);
    } catch (_) {
      return [];
    }
  }

  async function publishCloud(msg) {
    await loadCloudConfig();
    try {
      const res = await fetch(cloudUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          id: msg.id,
          room: msg.room,
          who: msg.who,
          text: msg.text,
          kind: msg.kind || "text",
          role: msg.role || "user",
          date: msg.date
        })
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  function merge(room, cloudList) {
    const byId = {};
    loadRoom(room).forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });
    (cloudList || []).forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });
    return Object.keys(byId)
      .map(function (k) {
        return byId[k];
      })
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      })
      .slice(0, 150);
  }

  async function list(room) {
    const cloud = await fetchCloud(room);
    const merged = merge(room, cloud);
    // keep local copy of merge
    const map = loadAll();
    map[room] = merged;
    saveAll(map);
    return merged;
  }

  async function send(room, who, text, opts) {
    opts = opts || {};
    const msg = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      room: room,
      who: String(who || "Игрок").slice(0, 40),
      text: String(text || "").trim().slice(0, 400),
      kind: opts.kind === "voice" ? "voice" : "text",
      role: opts.role || "user",
      date: new Date().toISOString(),
      shared: false
    };
    if (!msg.text) return { ok: false, msg: null, shared: false };
    pushLocal(room, msg);
    const ok = await publishCloud(msg);
    msg.shared = ok;
    if (ok) {
      const map = loadAll();
      const list = map[room] || [];
      const i = list.findIndex(function (x) {
        return x.id === msg.id;
      });
      if (i >= 0) list[i].shared = true;
      saveAll(map);
    }
    return { ok: true, msg: msg, shared: ok };
  }

  w.PortalChat = {
    list: list,
    send: send,
    loadRoom: loadRoom,
    LOCAL_KEY: LOCAL_KEY
  };
})(window);

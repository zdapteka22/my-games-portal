/* Каталог модов. Включение хранится ПО ИГРЕ: { gameId: { modId: true } } */
window.PORTAL_MODS = [
  { id: "all-knife-gold", games: ["*"], cat: "knife", title: "Золотой нож", desc: "Нож в играх, где есть ближний бой", emoji: "🔪" },
  { id: "all-knife-shadow", games: ["*"], cat: "knife", title: "Теневой клинок", desc: "Тихий удар, меньше шума у Соседа", emoji: "🗡️" },
  { id: "all-char-minion", games: ["*"], cat: "character", title: "Скин Миньон", desc: "Жёлтый герой в этой игре", emoji: "💛" },
  { id: "all-char-sonic", games: ["*"], cat: "character", title: "Скин Соник", desc: "Синий спидстер как персонаж", emoji: "💨" },
  { id: "all-mode-hard", games: ["*"], cat: "mode", title: "Сложный режим", desc: "Враги злее, паузы короче — только в этой игре", emoji: "🔥" },
  { id: "cg-rocket", games: ["chicken-gun"], cat: "knife", title: "Куриная базука", desc: "Chicken Gun: мощный выстрел", emoji: "🚀" },
  { id: "cg-dual", games: ["chicken-gun"], cat: "mode", title: "Два ствола", desc: "Стреляешь чаще", emoji: "🔫" },
  { id: "mn-sprint", games: ["meme-neighbor"], cat: "mode", title: "Сосед бежит", desc: "Сосед быстрее патрулирует", emoji: "🏃" },
  { id: "mn-mask", games: ["meme-neighbor"], cat: "character", title: "Маска мема", desc: "Сосед хуже тебя замечает", emoji: "🎭" },
  { id: "fn-night6", games: ["five-night-memes"], cat: "mode", title: "Ночь 6", desc: "Мемы агрессивнее", emoji: "🌙" },
  { id: "fn-cam", games: ["five-night-memes"], cat: "mode", title: "Лишняя камера", desc: "Камеры жрут меньше энергии", emoji: "📷" },
  { id: "snake-skin", games: ["snake"], cat: "character", title: "Радужная змейка", desc: "Цветной хвост", emoji: "🌈" },
  { id: "smesh-knife", games: ["smeshariki"], cat: "knife", title: "Супер-нож Кроша", desc: "Нож в битве сильнее", emoji: "🔪" },
  { id: "pac-ghost", games: ["pacman"], cat: "character", title: "Скин призрака", desc: "Играешь жёлтым, но с вайбом призрака", emoji: "👻" },
  { id: "tanks-mode", games: ["tanks"], cat: "mode", title: "Быстрые танки", desc: "Снаряды летят чаще", emoji: "💥" }
];

window.PORTAL_MOD_GAMES = [
  { id: "chicken-gun", title: "🐔 Chicken Gun" },
  { id: "meme-neighbor", title: "🏠 Meme Neighbor" },
  { id: "five-night-memes", title: "🌙 Five Night Memes" },
  { id: "smeshariki", title: "🟡 Смешарики" },
  { id: "mario", title: "🍄 Марио" },
  { id: "snake", title: "🐍 Змейка" },
  { id: "pacman", title: "👻 Пакман" },
  { id: "tanks", title: "💥 Танчики" }
];

var PORTAL_MODS_KEY = "portal_mods_on";

function _modFileToGame(file) {
  var map = {
    "chicken-gun": "chicken-gun",
    "meme-neighbor": "meme-neighbor",
    "five-night-memes": "five-night-memes",
    "mario": "mario",
    "snake": "snake",
    "pacman": "pacman",
    "tanks": "tanks",
    "index": "smeshariki"
  };
  return map[file] || file;
}

window.portalGuessGameId = function () {
  if (window.PORTAL_GAME_ID) return String(window.PORTAL_GAME_ID);
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("id")) return q.get("id");
    if (q.get("game")) return q.get("game");
  } catch (e) {}
  var parts = (location.pathname || "").split("/");
  var file = (parts.pop() || "").replace(/\.html$/i, "");
  if (file === "index" && /smeshariki/i.test(location.pathname)) return "smeshariki";
  return _modFileToGame(file);
};

window.portalModApplies = function (mod, gameId) {
  if (!mod) return false;
  var g = gameId || portalGuessGameId();
  var list = mod.games || [];
  return list.indexOf("*") >= 0 || list.indexOf(g) >= 0;
};

window.portalModsForGame = function (gameId) {
  var g = gameId || portalGuessGameId();
  return (window.PORTAL_MODS || []).filter(function (m) { return portalModApplies(m, g); });
};

function _modsStoreRaw() {
  try { return JSON.parse(localStorage.getItem(PORTAL_MODS_KEY) || "{}") || {}; }
  catch (e) { return {}; }
}

/* Старый формат { modId: true } больше не действует на все игры. */
function _modsStore() {
  var raw = _modsStoreRaw();
  var out = {};
  var k;
  for (k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    var v = raw[k];
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = v;
  }
  return out;
}

window.portalModOn = function (id, gameId) {
  var g = gameId || portalGuessGameId();
  if (!g || !id) return false;
  var store = _modsStore();
  return !!(store[g] && store[g][id]);
};

window.portalModSet = function (id, on, gameId) {
  var g = gameId || portalGuessGameId();
  if (!g || !id) return;
  var store = _modsStore();
  if (!store[g]) store[g] = {};
  if (on) store[g][id] = true;
  else delete store[g][id];
  if (!Object.keys(store[g]).length) delete store[g];
  localStorage.setItem(PORTAL_MODS_KEY, JSON.stringify(store));
};

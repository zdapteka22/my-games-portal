/* Shared mods catalog. Games read enabled ids from localStorage portal_mods_on */
window.PORTAL_MODS = [
  { id: "all-knife-gold", games: ["*"], cat: "knife", title: "Золотой нож", desc: "Нож в играх, где есть ближний бой", emoji: "🔪" },
  { id: "all-knife-shadow", games: ["*"], cat: "knife", title: "Теневой клинок", desc: "Тихий удар, меньше шума у Соседа", emoji: "🗡️" },
  { id: "all-char-minion", games: ["*"], cat: "character", title: "Скин Миньон", desc: "Жёлтый герой во всех играх, где есть скин", emoji: "💛" },
  { id: "all-char-sonic", games: ["*"], cat: "character", title: "Скин Соник", desc: "Синий спидстер как персонаж", emoji: "💨" },
  { id: "all-mode-hard", games: ["*"], cat: "mode", title: "Сложный режим", desc: "Враги злее, паузы короче", emoji: "🔥" },
  { id: "cg-rocket", games: ["chicken-gun"], cat: "knife", title: "Куриная базука", desc: "Chicken Gun: мощный выстрел", emoji: "🚀" },
  { id: "cg-dual", games: ["chicken-gun"], cat: "mode", title: "Два ствола", desc: "Стреляешь чаще", emoji: "🔫" },
  { id: "mn-sprint", games: ["meme-neighbor"], cat: "mode", title: "Сосед бежит", desc: "Сосед быстрее патрулирует", emoji: "🏃" },
  { id: "mn-mask", games: ["meme-neighbor"], cat: "character", title: "Маска мема", desc: "Сосед хуже тебя замечает", emoji: "🎭" },
  { id: "fn-night6", games: ["five-night-memes"], cat: "mode", title: "Ночь 6", desc: "Мемы агрессивнее", emoji: "🌙" },
  { id: "fn-cam", games: ["five-night-memes"], cat: "mode", title: "Лишняя камера", desc: "Камеры жрут меньше энергии", emoji: "📷" },
  { id: "snake-skin", games: ["snake"], cat: "character", title: "Радужная змейка", desc: "Цветной хвост", emoji: "🌈" },
  { id: "mario-luigi", games: ["mario"], cat: "character", title: "Играть за Луиджи", desc: "Зелёный брат", emoji: "🟢" },
  { id: "smesh-knife", games: ["smeshariki"], cat: "knife", title: "Супер-нож Кроша", desc: "Нож в битве сильнее", emoji: "🔪" },
  { id: "pac-ghost", games: ["pacman"], cat: "character", title: "Скин призрака", desc: "Играешь жёлтым, но с вайбом призрака", emoji: "👻" },
  { id: "tanks-mode", games: ["tanks"], cat: "mode", title: "Быстрые танки", desc: "Снаряды летят чаще", emoji: "💥" }
];

window.portalModOn = function (id) {
  try {
    return !!(JSON.parse(localStorage.getItem("portal_mods_on") || "{}")[id]);
  } catch (e) {
    return false;
  }
};
window.portalModSet = function (id, on) {
  var m = {};
  try { m = JSON.parse(localStorage.getItem("portal_mods_on") || "{}") || {}; } catch (e) { m = {}; }
  m[id] = !!on;
  localStorage.setItem("portal_mods_on", JSON.stringify(m));
};

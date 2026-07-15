/* Blue Cat — вход и премиум.
   Заполни ID ниже, чтобы работало «по-настоящему».

   Google:
   1) https://console.cloud.google.com/ → Credentials → OAuth Web
   2) Origins: https://zdapteka22.github.io  (+ localhost)

   VK ID:
   1) https://id.vk.com/about/business/go → создать приложение
   2) Тип: веб-сайт, домен: zdapteka22.github.io
   3) Redirect URL: https://zdapteka22.github.io/my-games-portal/index.html
      (или https://zdapteka22.github.io/my-games-portal/)
   4) Вставь App ID (число) в VK_APP_ID

   Telegram Login Widget:
   1) @BotFather → /newbot → получи токен
   2) /setdomain → привяжи zdapteka22.github.io
   3) TELEGRAM_BOT_USERNAME = имя бота без @ (например bluecat_portal_bot)
*/
window.AUTH_CONFIG = {
  // Google Cloud Console → OAuth 2.0 Client ID (Web)
  GOOGLE_CLIENT_ID: "",

  // VK App ID (число, строкой)
  VK_APP_ID: "",

  // Telegram: username бота без @
  TELEGRAM_BOT_USERNAME: "",

  // Цена премиума
  PREMIUM_PRICE_RUB: 10,
  PREMIUM_DAYS: 30,

  // Ссылка на оплату 10 ₽
  PAYMENT_URL: "",

  // Код тестовой активации премиума
  PREMIUM_TEST_CODE: "BLUECAT10"
};

/* Blue Cat — вход и премиум.
   Заполни GOOGLE_CLIENT_ID и PAYMENT_URL, чтобы работало «по-настоящему».
*/
window.AUTH_CONFIG = {
  // Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web)
  // Authorized JavaScript origins: https://zdapteka22.github.io
  GOOGLE_CLIENT_ID: "", // например: "123456789-xxxx.apps.googleusercontent.com"

  // Цена премиума
  PREMIUM_PRICE_RUB: 10,
  PREMIUM_DAYS: 30, // дней после оплаты

  // Ссылка на оплату 10 ₽ (ЮMoney / CloudPayments / свой магазин).
  // Пример ЮMoney: "https://yoomoney.ru/to/41001XXXXXXXX"
  // Или quickpay: "https://yoomoney.ru/quickpay/confirm.xml?..."
  PAYMENT_URL: "",

  // Код для тестовой активации премиума (можно сменить)
  PREMIUM_TEST_CODE: "BLUECAT10"
};

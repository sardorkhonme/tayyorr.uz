/// Backend — tayyorr.uz saytining o'zi (Next.js API route'lari).
/// Mahalliy backendda sinash uchun kodni o'zgartirmang, yig'ishda bering:
///   flutter run --dart-define=API_BASE=http://10.0.2.2:3000/api
const String kApiBaseUrl = String.fromEnvironment('API_BASE', defaultValue: 'https://app.tayyorr.uz/api');

/// tayyorr+ (plus.tayyorr.uz) — ilova ichida WebView'da ochiladi.
const String kPlusUrl = String.fromEnvironment('PLUS_URL', defaultValue: 'https://plus.tayyorr.uz');

/// tayyorr.uz veb sayti (NextAuth) uchun ishlatilgan Google OAuth Web Client
/// ID — bu maxfiy emas (Client Secret emas), shuning uchun ilova ichida
/// ochiq tursa bo'ladi. `google_sign_in`ga `serverClientId` sifatida
/// beriladi — shunda olingan ID token backend'dagi shu bilan bir xil
/// auditoriya (audience) uchun tekshiriladi.
const String kGoogleServerClientId =
    '206777863976-nqr6j6flilktv8nkpnc681r15gu3ohgb.apps.googleusercontent.com';

/// Sayt manzili (API manzilidan) — ichki havolalarni brauzerda ochish uchun.
String get kSiteUrl => kApiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');

/// Ommaviy sayt (landing) — ulashiladigan havolalar uchun (referal: tayyorr.uz/r/... → app ga yo'naltiriladi).
const String kPublicSiteUrl = 'https://tayyorr.uz';

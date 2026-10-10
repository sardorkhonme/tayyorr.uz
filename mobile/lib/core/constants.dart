/// Backend — tayyorr.uz saytining o'zi (Next.js API route'lari).
/// Kerak bo'lsa mahalliy backendga sinab ko'rish uchun shu qiymatni
/// o'zgartiring (masalan http://10.0.2.2:3000/api Android emulyatori uchun).
const String kApiBaseUrl = 'https://tayyorr.uz/api';

/// tayyorr.uz veb sayti (NextAuth) uchun ishlatilgan Google OAuth Web Client
/// ID — bu maxfiy emas (Client Secret emas), shuning uchun ilova ichida
/// ochiq tursa bo'ladi. `google_sign_in`ga `serverClientId` sifatida
/// beriladi — shunda olingan ID token backend'dagi shu bilan bir xil
/// auditoriya (audience) uchun tekshiriladi.
const String kGoogleServerClientId =
    '206777863976-nqr6j6flilktv8nkpnc681r15gu3ohgb.apps.googleusercontent.com';

/// Sayt manzili (API manzilidan) — ichki havolalarni brauzerda ochish uchun.
String get kSiteUrl => kApiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');

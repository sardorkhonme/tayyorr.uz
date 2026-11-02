# tayyorr.uz

Prezentatsiya, kurs ishi, referat va shu kabi ishlarni buyurtma qilish/tayyorlash platformasi.

**Stack:** Next.js 15 (App Router) · Prisma · Neon (PostgreSQL) · Auth.js v5 (login/parol + Google) · Cloudflare R2 (S3-mos) · Tailwind CSS v4

## Rollar

- **ORDERER (buyurtma beruvchi)** — buyurtma qo'shadi, u barcha tayyorlovchilarga ko'rinadi, kelgan takliflardan birini tanlaydi.
- **PREPARER (tayyorlovchi)** — ochiq buyurtmalarni ko'radi, taklif (narx + xabar) yuboradi, dashboard'da **bir bosishda** "band / bo'sh" holatini yangilaydi.

**Ro'yxatdan o'tish faqat Google orqali.** Oqim:
1. `/register` — rol tanlanadi → "Google bilan ro'yxatdan o'tish".
2. Google qaytгач `/onboarding` — ism, familiya, login, **parol**, ma'lumot, glavniy rasm (hammasi majburiy). Parol keyinchalik `/login` da login+parol bilan kirish uchun.

`/login` — login+parol yoki Google, ikkalasi ham ishlaydi (chunki akkaunt Google'ga bog'langan).

## Ishga tushirish

```bash
npm install
cp .env.example .env      # qiymatlarni to'ldiring (yoki mavjud .env dan foydalaning)
npm run db:push           # Prisma sxemasini Neon'ga yuboradi
node scripts/setup-r2.mjs # R2 bucketlarga CORS o'rnatadi
npm run dev               # http://localhost:3000
```

## Qo'lda bajariladigan sozlamalar

### 1. R2 public URL

`tayyorr-public` bucket ochiq rasmlar uchun. Cloudflare dashboard →
R2 → `tayyorr-public` → Settings → **Public Development URL** → Enable.
Chiqqan `https://pub-xxxx.r2.dev` manzilini `.env` dagi `R2_PUBLIC_URL` ga qo'ying.
(Keyinchalik `cdn.tayyorr.uz` custom domenga o'tkazish tavsiya etiladi.)

### 2. Google OAuth redirect URI

Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://tayyorr.uz/api/auth/callback/google
```

### 3. Production'da

- `AUTH_URL` va CORS origin'larni haqiqiy domenga o'zgartiring
  (`CORS_ORIGINS` env bilan `scripts/setup-r2.mjs` ni qayta ishga tushiring).
- Neon parolini rotatsiya qiling, `.env` ni hech qachon commit qilmang.

## Struktura

```
src/
  auth.ts / auth.config.ts   Auth.js (JWT session, Prisma adapter)
  middleware.ts              himoyalangan route'lar
  lib/db.ts                  Prisma singleton
  lib/r2.ts                  R2 klient + presigned URL helperlar
  lib/upload-client.ts       brauzer -> R2 to'g'ridan yuklash
  app/
    (auth)/login             login+parol yoki Google
    (auth)/register          rol tanlash + Google bilan boshlash
    onboarding               Google'dan keyin: ism/familiya/login/parol/ma'lumot/rasm (majburiy)
    (app)/dashboard          rolga qarab ko'rinish, band/bo'sh toggle
    (app)/orders             buyurtmalar lentasi + /new + /[id]
    (app)/profile            profil + glavniy rasm
    api/
      auth/[...nextauth]     Auth.js handler
      register, onboarding, me, me/availability
      orders, orders/[id], orders/[id]/offers, offers/[id]
      upload/presign, upload/complete
```

## Hamyon (balans)

Har foydalanuvchida `balance` (so'm) va qisqa `walletCode` (masalan `TYR-8FK2`).
Kabinet va `/wallet` sahifasida balans ko'rinadi.

- To'ldirish faqat **Click** orqali: [/api/wallet/topup/click](src/app/api/wallet/topup/click/route.ts)
  `PENDING` amal yaratadi, [Prepare](src/app/api/payments/click/prepare/route.ts) /
  [Complete](src/app/api/payments/click/complete/route.ts) webhook'lari uni `SUCCESS` qilib balansni oshiradi
  (`method: "CLICK"`). Mobil ilova: `/api/mobile/wallet/topup` (xuddi shu Click oqimi).
- Eski DEMO to'ldirish endpoint'i (`/api/wallet/topup`) xavfsizlik sababli olib tashlangan.

## Admin panel — `/sardorxon/admin`

Asosiy ilovadan alohida autentifikatsiya: `ADMIN_LOGIN` / `ADMIN_PASSWORD` ([.env](.env)),
imzolangan cookie (`tyr_admin`, HMAC + `AUTH_SECRET`). [lib/admin.ts](src/lib/admin.ts).

- **To'lovlar** — barcha `WalletTransaction`, har birining **cheki** (`/payments/[id]`),
  **bekor qilish** ([reverse](src/app/api/admin/payments/[id]/reverse/route.ts)): asl amal `FAILED` + `reversedAt`,
  qarama-qarshi `REFUND` yoziladi, balans qayta hisoblanadi.
- **Foydalanuvchilar** — qidiruv, hisob kartasi, **ban/cheklash** (1/3/7/30 kun yoki muddatsiz + sabab),
  **tayyorr.uz support** nomidan xabar yuborish, hisob amallari + reverse, suhbatlar ro'yxati.
- **Shikoyatlar** — ro'yxat → detal: shikoyatchi va gumondor kartalari, matn, ularning
  yozishmasiga va har ikki hisobga o'tish, holat + admin izohi.
- **Suhbatlar** — barcha `Conversation`, to'liq tarix (admin uchun har doim ochiq),
  **foydalanuvchilardan yashirish** (`hiddenFromUsersAt` — bazada qoladi, ikkala tomonда yo'qoladi).

### Shikoyat (foydalanuvchi tomonidan)
Chat oynasi va buyurtma taklif kartasidagi **⚠︎ Shikoyat** tugmasi → [/api/complaints](src/app/api/complaints/route.ts).

### Admin — Xabarlar
`/sardorxon/admin/messages` — «tayyorr.uz support» ishtirok etgan barcha suhbatlar,
javob kutayotganlar belgisi bilan. Thread ([AdminChatThread](src/components/admin/admin-chat-thread.tsx)):
admin support nomidan yozadi/fayl yuboradi (3s polling), foydalanuvchi xabarlari ochilgach o'qilgan bo'ladi.
API: [messages GET](src/app/api/admin/chats/[id]/messages/route.ts), [reply POST](src/app/api/admin/chats/[id]/reply/route.ts), [upload/presign](src/app/api/admin/upload/presign/route.ts).

### Cheklov (ban) ta'siri
- `User.bannedUntil` kelajakda bo'lsa — boshqa `(app)` sahifalar **redirect qilmaydi**, o'rniga
  [RestrictionNotice](src/components/restriction-notice.tsx) ogohlantirishini ko'rsatadi; barcha mutatsiya API'lari `403`.
- **Messenger to'liq ishlaydi.** Boshqa foydalanuvchiga yozolmaydi (javoban cheklov matni);
  faqat **tayyorr.uz support** bilan yozishadi (matn + fayl). Support xabarlari real vaqtda kelaveradi.
- `tayyorr.uz support` — `isSupport: true` tizim hisobi ([lib/support.ts](src/lib/support.ts)), chat/SSE infratuzilmasidan foydalanadi.

## Chatda fayl almashinuvi
- `Message` da `fileKey/fileName/fileType/fileSize`. Fayllar **R2 private** bucket, `chat/<conversationId>/` prefiks.
- Yuborish: [upload/presign](src/app/api/upload/presign/route.ts) `kind: "CHAT"` → to'g'ridan R2 ga PUT →
  [messages POST](src/app/api/chat/[id]/messages/route.ts) `{ file }` (matn ixtiyoriy).
- Ko'rsatish: har yuklashda 1 soatlik presigned GET ([chat-messages.ts](src/lib/chat-messages.ts)); rasm — inline, boshqa — yuklab olish chipi ([chat-file.tsx](src/components/chat-file.tsx)).
- Cheklangan foydalanuvchi faqat support thread'ida fayl yubora oladi. Limit: 25MB.

## Shartnoma + eskrou (escrow)

Buyurtmachi tayyorlovchi bilan kelishgach:
1. **Shartnoma yuboradi** ([/api/orders/[id]/contract](src/app/api/orders/[id]/contract/route.ts)) — kelishilgan summa + batafsil tavsif. Hisobда yetarli mablag' bo'lsa **darhol bloklanadi (HOLD)**, o'rtada turadi.
2. Tayyorlovchi shartlarni o'qib **qabul qiladi** ([/api/contracts/[id]](src/app/api/contracts/[id]/route.ts), action ACCEPT) — buyurtma `IN_PROGRESS`. Yakuniga qadar chatда gaplashadilar.
3. **Yakunlash** (faqat buyurtmачi, [/api/orders/[id]/finalize](src/app/api/orders/[id]/finalize/route.ts)) — eskroudan **95%** tayyorlovchi hisobiga (`RELEASE`), **5%** saytga (`COMMISSION`). Buyurtma `DONE` → baholash.
4. Yakunlash oldida **bekor qilish** — shartnoma bekor, **2%** saytда qoladi, qolgani buyurtmачiga qaytadi. Qabul qilinmаган shartnomani bekor qilса/rad etса — to'liq qaytadi.

Komissiya **`tayyorr.uz` platform hisobiga** yig'iladi ([lib/platform.ts](src/lib/platform.ts)). Yechib olish keyinroq.
Wallet turlari: `HOLD`, `RELEASE`, `COMMISSION` (barchasi `method: "ESCROW"`).

## Push bildirishnomalar

Yangi chat xabari kelganда brauzer bildirishnomasi (Web Push + service worker).
- [public/sw.js](public/sw.js) — `push` / `notificationclick`; suhbat oynasi ochiq+ko'rinib tursa bildirishnoma bermaydi.
- [PushSetup](src/components/push-setup.tsx) — SW ni ro'yxatga oladi, "Yoqish" tugmasi bilan ruxsat so'raydi, obunani [/api/push/subscribe](src/app/api/push/subscribe/route.ts) ga yuboradi.
- [deliverMessage](src/lib/chat-notify.ts) — har yangi xabarда SSE + qabul qiluvchiga web-push.
- **VAPID kalitlari** kerak: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`npx web-push generate-vapid-keys --json`). Vercel'ga ham qo'shing.
- iOS'da faqat "Add to Home Screen" (PWA) rejimида ishlaydi; Android/desktop Chrome to'g'ridан ishlaydi.

## Messenger (real-time chat)

- **[/messages](src/app/(app)/messages/page.tsx)** — suhbatlar ro'yxati (oxirgi xabar, o'qilmaganlar soni).
- **[/messages/[id]](src/app/(app)/messages/[id]/page.tsx)** + **[ChatRoom](src/components/chat-room.tsx)** — real vaqt chat.
- Buyurtma sahifasida ([order-actions](src/components/order-actions.tsx)): buyurtmachi har bir taklif yonidagi **💬 Chat** tugmasi bilan tayyorlovchi bilan suhbat ochadi; tanlangan tayyorlovchida "Buyurtmachi bilan yozishish" tugmasi.
- Bir juftlik = bitta suhbat (`Conversation`, `userAId < userBId`); `orderId` — boshlangан kontekst.

**Real vaqt mexanizmi:**
- **SSE** (`GET /api/chat/[id]/stream`) — Node runtime, jarayon ichidagi `EventEmitter` ([chat-bus.ts](src/lib/chat-bus.ts)) orqali yangi xabar darhol push qilinadi.
- **Polling fallback** — klient har 4 soniyada `GET /api/chat/[id]?after=<ms>` bilan yangi xabarlarni oladi (SSE uzilса yoki ko'p instansiyali deploy bo'lsa).
- Miqyoslash: bir Node instansiyada to'liq ishlaydi. Ko'p instansiya (serverless) uchun keyinchalik `EventEmitter` o'rniga Redis Pub/Sub yoki Ably/Pusher qo'yiladi — API va UI o'zgarmaydi.

## Ma'lumotlar oqimi: fayl yuklash

1. Klient `POST /api/upload/presign` — backend R2 uchun **presigned PUT URL** qaytaradi.
2. Klient faylni to'g'ridan R2 ga `PUT` qiladi (server orqali o'tmaydi).
3. (ixtiyoriy) `POST /api/upload/complete` — `FileObject` yozuvini bazaga qo'shadi.
4. Ochiq rasm: `R2_PUBLIC_URL/<key>`. Yopiq fayl: har safar 10 daqiqalik presigned GET URL.

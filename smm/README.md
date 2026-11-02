# TayyorrSMM — smm.tayyorr.uz

tayyorr.uz oilasidagi alohida sayt: Instagram, Telegram, TikTok, YouTube va boshqalar uchun
avtomatik SMM xizmatlari (obunachi, layk, ko'rish…).

**Asosiy sayt bilan nima umumiy:** baza (Neon). Foydalanuvchi tayyorr.uz login/email + parol
yoki Google bilan kiradi; hamyon (`User.balance`) bitta — tayyorr.uz da to'ldirilgan pul shu yerda sarflanadi.
Bu yerda yangi hisob yaratilmaydi, ro'yxatdan o'tish faqat tayyorr.uz da.

## Tuzilma

```
smm/
  src/auth.ts              Auth.js (JWT): Credentials (login yoki email) + Google — faqat mavjud User
  src/lib/provider.ts      SMM panel API v2 klienti (services / add / status)
  src/lib/orders.ts        buyurtma: hamyondan atomik yechish → provayder; holat sinxroni + avtomatik qaytarish
  src/app/page.tsx         dashboard: balans + platforma bloklari + xizmatlar kartochkalari
  src/app/orders           buyurtmalarim
  src/app/login            kirish
  src/app/api/orders       POST buyurtma, GET ro'yxat
  src/app/api/cron/sync    faol buyurtmalar holati (CRON_SECRET bilan)
  scripts/sync-services.mjs  provayder xizmatlarini import / narx yangilash
```

Prisma sxemasi umumiy: `../prisma/schema.prisma` (`SmmService`, `SmmOrder`).

## Pul oqimi

- Buyurtma: `balance >= charge` sharti bilan atomik yechiladi → `WalletTransaction` `SPEND`, `method: "SMM"`.
- Provayder rad etsa — darhol to'liq qaytadi (`REFUND`, `method: "SMM"`).
- `Partial` — bajarilmagan qismi, `Canceled` — to'liq summa qaytadi. Har buyurtma faqat bir marta yakunlanadi.
- To'ldirish: Click ([/api/wallet/topup](src/app/api/wallet/topup/route.ts)) — `PENDING` `TOPUP` yaratiladi,
  Click'ning Prepare/Complete webhook'lari **tayyorr.uz** ga keladi va umumiy bazadagi shu tranzaksiyani
  tasdiqlaydi. Click kabinetida hech narsa o'zgarmaydi.
- Barcha amallar tayyorr.uz admin → To'lovlar va foydalanuvchi hamyonida ko'rinadi.

## ZOSMM balans ogohlantirishi

[balance-alert.ts](src/lib/balance-alert.ts) — balans 100k / 50k / 40k / 30k / 20k / 10k so'mdan
pastga tushganda admin Telegram guruhiga bir martadan xabar; to'ldirilgach "to'ldirildi" xabari.
Tekshiruv: har buyurtmadan keyin va `/api/cron/sync` da (cron-job.org orqali har 10 daqiqa:
`GET https://smm.tayyorr.uz/api/cron/sync`, header `Authorization: Bearer <CRON_SECRET>`).

## Env (Vercel → smm loyihasi)

| Kalit | Izoh |
|---|---|
| `DATABASE_URL` | tayyorr.uz bilan **bir xil** |
| `AUTH_SECRET` | yangi (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://smm.tayyorr.uz` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | tayyorr.uz dagi OAuth client |
| `SMM_PROVIDER_URL` | `https://zosmm.com/api/v2` |
| `SMM_PROVIDER_KEY` | ZOSMM → Account → API key |
| `SMM_PROVIDER_RATE_UZS` | ZOSMM narxlari USD da — 1 USD kursi (masalan 12800) |
| `SMM_MARKUP` | ustama (1.5 = +50%) |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` | tayyorr.uz dagi Click qiymatlari (secret key shart emas) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LOG_GROUP_ID` | tayyorr.uz dagi bilan bir xil — ZOSMM balans ogohlantirishlari |
| `TELEGRAM_TOPIC_SMM` | ixtiyoriy: guruhdagi topik id (bo'lmasa `TELEGRAM_TOPIC_PAYMENTS`) |
| `CRON_SECRET` | `/api/cron/sync` uchun |
| `NEXT_PUBLIC_MAIN_URL` | `https://tayyorr.uz` |

## Ishga tushirish

```bash
cd smm
npm install
cp ../.env .env.local        # va yuqoridagi SMM_* qiymatlarni qo'shing
npm run sync-services        # xizmatlarni import qilish
npm run dev                  # http://localhost:3010
```

## Deploy (yangi Vercel loyiha)

1. Vercel → Add New Project → shu repo → **Root Directory: `smm`**
   ("Include files outside the root directory" yoqilgan bo'lsin — Prisma sxemasi `../prisma` da).
2. Env qiymatlarni qo'shing.
3. Domains → `smm.tayyorr.uz`; DNS da `smm` uchun `CNAME cname.vercel-dns.com`.
4. Google Cloud Console → OAuth client → redirect URI: `https://smm.tayyorr.uz/api/auth/callback/google`.

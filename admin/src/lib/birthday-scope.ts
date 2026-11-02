/**
 * Google'dan tug'ilgan kunni so'rash ruxsati (user.birthday.read).
 * Bu "sezgir" scope — Google Cloud Console'da OAuth ekraniga qo'shilib,
 * Google tasdiqlagandan keyingina GOOGLE_BIRTHDAY_SCOPE=1 qilinadi.
 * Aks holda foydalanuvchilarga "ilova tasdiqlanmagan" ogohlantirishi chiqadi.
 *
 * Edge (middleware) ham import qiladi — shu sabab bu faylda Prisma yo'q.
 */
export const GOOGLE_BIRTHDAY_SCOPE = "https://www.googleapis.com/auth/user.birthday.read";
export const googleBirthdayEnabled = () => process.env.GOOGLE_BIRTHDAY_SCOPE === "1";

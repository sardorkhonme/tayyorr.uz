/** Mobil ilova uchun foydalanuvchi profilini bir xil shaklda qaytarish. */
export const ME_SELECT = {
  id: true,
  login: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  about: true,
  avatarUrl: true,
  image: true,
  balance: true,
  starBalance: true,
  walletCode: true,
  ratingSum: true,
  ratingCount: true,
  isAvailable: true,
  createdAt: true,
  theme: true,
  birthDate: true,
} as const;

type MeUser = {
  birthDate?: Date | null;
  id: string;
  login: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  about: string | null;
  avatarUrl: string | null;
  image: string | null;
  balance: number;
  starBalance: number;
  walletCode: string | null;
  ratingSum: number;
  ratingCount: number;
  isAvailable: boolean;
  createdAt: Date;
  theme: string | null;
};

export function serializeMe(u: MeUser) {
  return {
    id: u.id,
    login: u.login,
    name: u.name ?? (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || null),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    about: u.about,
    image: u.avatarUrl ?? u.image,
    balance: u.balance,
    starBalance: u.starBalance,
    walletCode: u.walletCode,
    rating: u.ratingCount ? u.ratingSum / u.ratingCount : null,
    ratingCount: u.ratingCount,
    isAvailable: u.isAvailable,
    createdAt: u.createdAt.toISOString(),
    theme: u.theme === "light" ? "light" : "dark",
    birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
    needsOnboarding: !(u.role && u.login),
  };
}

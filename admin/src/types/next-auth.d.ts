import type { DefaultSession } from "next-auth";

type AppRole = "ORDERER" | "PREPARER" | null;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      login: string | null;
      profileComplete: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    login?: string | null;
    profileComplete?: boolean;
  }
}

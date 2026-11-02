"use client";

import { createContext, useContext, useEffect } from "react";

import { translate } from "@/lib/i18n";

interface Ctx {
  locale: "uz";
  setLocale: (l: string) => void;
  t: (key: string) => string;
}

// v1 — faqat o'zbekcha. Boshqa tillar v2 da.
const VALUE: Ctx = {
  locale: "uz",
  setLocale: () => {},
  t: (k) => translate("uz", k),
};

const LocaleCtx = createContext<Ctx>(VALUE);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // eski til sozlamalarini tozalaymiz
    try {
      localStorage.removeItem("tyr_locale");
    } catch {
      /* ignore */
    }
    document.cookie = "tyr_locale=; path=/; max-age=0";
    document.documentElement.lang = "uz";
  }, []);

  return <LocaleCtx.Provider value={VALUE}>{children}</LocaleCtx.Provider>;
}

export const useLocale = () => useContext(LocaleCtx);

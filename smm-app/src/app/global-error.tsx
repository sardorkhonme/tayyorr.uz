"use client";

import { Mascot } from "@/components/mascot";

/** Root layout ham yiqilganda — globals.css yuklanmasligi mumkin, şuning uçun inline uslublar. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          background: "#f7f7fb",
          color: "#16161d",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <Mascot pose="error" size={200} priority />
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Xatolik yuz berdi</h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b6b78", maxWidth: "20rem" }}>
          Sahifani qaytadan yuklaşga urinib köring.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.75rem",
            borderRadius: "0.9rem",
            border: "none",
            background: "linear-gradient(180deg,#6366f1,#4f46e5)",
            color: "#fff",
            padding: "0.7rem 1.25rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Qaytadan urinib köriş
        </button>
      </body>
    </html>
  );
}

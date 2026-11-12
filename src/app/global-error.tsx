"use client";

import { Mascot } from "@/components/mascot";

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
          gap: "1rem",
          background: "#08080d",
          color: "#e4e4e7",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <Mascot pose="error" size={200} priority />
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff" }}>
          Xatolik yuz berdi
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#71717a", maxWidth: "20rem" }}>
          Sahifani qaytadan yuklaşga urinib köring.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "linear-gradient(180deg,#6366f1,#4f46e5)",
            color: "#fff",
            padding: "0.6rem 1.2rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Qaytadan
        </button>
      </body>
    </html>
  );
}

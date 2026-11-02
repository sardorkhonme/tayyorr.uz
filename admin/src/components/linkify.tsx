"use client";

import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
// url oxiridagi tinish belgilarini ajratamiz
const TRAIL_RE = /[.,!?;:)\]}'"»]+$/;

/** Matndagi havolalarni ko'k, bosiladigan qilib chiqaradi. */
export function Linkify({
  text,
  mine = false,
}: {
  text: string;
  mine?: boolean;
}) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

        const trail = part.match(TRAIL_RE)?.[0] ?? "";
        const url = trail ? part.slice(0, -trail.length) : part;
        const href = url.startsWith("http") ? url : `https://${url}`;

        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`underline underline-offset-2 hover:opacity-80 ${
                mine ? "text-sky-200" : "text-sky-400"
              }`}
            >
              {url}
            </a>
            {trail}
          </Fragment>
        );
      })}
    </>
  );
}

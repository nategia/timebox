import type { Kind } from "@/domain/types";

/** Full class names so Tailwind's scanner keeps them. */
export const KIND_BG: Record<Kind | "fixed", string> = {
  deep: "bg-deep",
  body: "bg-body",
  light: "bg-light",
  fixed: "bg-fixed",
};

export const KIND_BLOCK: Record<Kind | "fixed", string> = {
  deep: "bg-deep/15 border-deep text-ink",
  body: "bg-body/15 border-body text-ink",
  light: "bg-light/15 border-light text-ink",
  fixed: "bg-fixed/15 border-fixed text-ink",
};

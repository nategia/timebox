import type { Kind } from "@/domain/types";

/** Full class names so Tailwind's scanner keeps them. */
export const KIND_BG: Record<Kind | "fixed", string> = {
  deep: "bg-deep",
  body: "bg-body",
  light: "bg-light",
  fixed: "bg-fixed",
};

export const KIND_BLOCK: Record<Kind | "fixed", string> = {
  deep: "bg-deep/10 border-deep text-foreground",
  body: "bg-body/10 border-body text-foreground",
  light: "bg-light/10 border-light text-foreground",
  fixed: "bg-fixed/10 border-fixed text-foreground",
};

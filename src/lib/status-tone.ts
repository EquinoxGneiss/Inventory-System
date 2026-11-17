/**
 * Status tone families (UI/UX spec §8.5). Tones choose badge colors; every
 * badge also carries a text label, so status is never conveyed by color alone.
 */
export const STATUS_TONES = [
  "neutral",
  "info",
  "warning",
  "success",
  "transit",
  "danger",
  "muted",
] as const;

export type StatusTone = (typeof STATUS_TONES)[number];

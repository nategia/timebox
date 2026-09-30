/** Calendar share-link rules, shared by the browser (instant feedback) and the server (enforcement). */

export type LinkProblem = "not_a_calendar_link" | "calendar_page_link";

const GOOGLE_HOST = "calendar.google.com";
const ICLOUD_HOST = /^p\d+-caldav\.icloud\.com$/;
const GOOGLE_ICAL_PATH = /^\/calendar\/ical\/[^/]+\/(private-[^/]+|public)\/basic\.ics$/;

/** `webcal://` is how Apple hands out links; it's plain https underneath. */
export const normalizeLink = (raw: string) => raw.trim().replace(/^webcal:/i, "https:");

/** Only these hosts are ever fetched, including after redirects (keeps the function from being an open proxy). */
export const isAllowedHost = (url: URL) =>
  url.protocol === "https:" && (url.hostname === GOOGLE_HOST || ICLOUD_HOST.test(url.hostname));

/**
 * Null if the link looks like a Google iCal or iCloud published-calendar link. Also recognises
 * the mistake almost everyone makes first: copying the Google Calendar page's address
 * (calendar.google.com/calendar/u/1?…) instead of the iCal link.
 */
export function checkLinkShape(raw: string): LinkProblem | null {
  let url: URL;
  try {
    url = new URL(normalizeLink(raw));
  } catch {
    return "not_a_calendar_link";
  }
  if (!isAllowedHost(url)) return "not_a_calendar_link";
  if (url.hostname === GOOGLE_HOST) return GOOGLE_ICAL_PATH.test(url.pathname) ? null : "calendar_page_link";
  return url.pathname.startsWith("/published/") ? null : "not_a_calendar_link";
}

/** Short user-facing text for each problem the app or the server can report. */
export const LINK_HINT: Record<string, string> = {
  calendar_page_link:
    "That's the Google Calendar page address. Use Settings → your calendar → Integrate calendar → “Secret address in iCal format”.",
  not_a_calendar_link: "That isn't a Google iCal link or an iCloud public calendar link.",
  not_a_calendar: "The link didn't return a calendar (often a sign-in page: the calendar may be private or the link reset).",
  unreachable: "Couldn't reach the calendar right now. Showing the last events we got.",
  too_large: "That calendar is too big to load (over 5 MB).",
  bad_request: "Something went wrong asking for this calendar.",
};

/** Shows enough of a secret link to recognise it, never the secret part. */
export function maskLink(raw: string): string {
  try {
    const url = new URL(normalizeLink(raw));
    return `${url.hostname}/…${url.pathname.slice(-6)}`;
  } catch {
    return "invalid link";
  }
}

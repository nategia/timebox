import { handleCalendarRequest } from "../server/calendar.js";

/** Vercel function for /api/calendar. All logic lives in server/calendar.ts (shared with the Vite dev server). */
export function POST(request: Request): Promise<Response> {
  return handleCalendarRequest(request);
}

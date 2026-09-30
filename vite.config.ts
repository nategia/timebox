import { readFileSync } from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

/**
 * Serves api/*.ts handlers in `npm run dev`, so local dev matches Vercel with one command.
 * Loaded through Vite's SSR loader, so edits to server/ apply without a restart.
 */
function devApi(): Plugin {
  return {
    name: "timebox-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/calendar", async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const request = new Request(`http://localhost${req.originalUrl ?? "/api/calendar"}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
        });
        const { handleCalendarRequest } = await server.ssrLoadModule("/server/calendar.ts");
        const response: Response = await handleCalendarRequest(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

/** `npm run preview` sends the same security headers as Vercel, so CSP problems show up before deploying. */
const vercelHeaders = (): Record<string, string> => {
  const config = JSON.parse(readFileSync(path.resolve(__dirname, "vercel.json"), "utf8")) as {
    headers: { headers: { key: string; value: string }[] }[];
  };
  return Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]));
};

export default defineConfig({
  plugins: [react(), devApi()],
  preview: { headers: vercelHeaders() },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

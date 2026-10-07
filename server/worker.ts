import http from "node:http";
import { handleAsNodeRequest } from "cloudflare:node";
import { createBookPilotApp } from "./app";

// Initialize the Express app and register Node HTTP bridge server
const app = createBookPilotApp();
const server = http.createServer(app);
const WORKER_NODE_PORT = 8080;
server.listen(WORKER_NODE_PORT);

export interface WorkerEnv {
  ASSETS?: {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
  };
  DATABASE_URL?: string;
  GEMINI_API_KEY?: string;
  SESSION_SECRET?: string;
  NODE_ENV?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: any): Promise<Response> {
    // Populate process.env with runtime Cloudflare environment variables
    if (env && typeof env === "object") {
      for (const [key, val] of Object.entries(env)) {
        if (typeof val === "string" && val.length > 0 && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }

    const url = new URL(request.url);

    // 1. API routes: delegate to Node.js Express instance
    if (url.pathname.startsWith("/api")) {
      try {
        return await handleAsNodeRequest(request, WORKER_NODE_PORT);
      } catch (err: any) {
        console.error("[Cloudflare Worker API Error]:", err);
        return new Response(
          JSON.stringify({
            success: false,
            error: "WORKER_INTERNAL_ERROR",
            message: "Erreur interne du serveur lors du traitement de la requête."
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // 2. Static Assets: serve Vite build artifacts from dist
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

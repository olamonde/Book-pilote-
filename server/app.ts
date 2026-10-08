import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { handleApiRequest } from "./apiHandler";

dotenv.config();

export function createBookPilotApp(): express.Express {
  const app = express();

  app.use(cookieParser());
  app.use(express.raw({ type: "*/*", limit: "25mb" }));

  // Delegate all /api/* routes to the unified Web standard API dispatcher
  app.all("/api/*", async (req, res, next) => {
    try {
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      const method = req.method;
      let body: BodyInit | undefined = undefined;
      if (method !== "GET" && method !== "HEAD") {
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
          body = req.body;
        } else if (typeof req.body === "string" && req.body.length > 0) {
          body = req.body;
        }
      }

      const webReq = new Request(fullUrl, { method, headers, body });
      const webRes = await handleApiRequest(webReq);

      res.status(webRes.status);
      webRes.headers.forEach((val, name) => {
        if (name.toLowerCase() === "set-cookie") {
          res.append("Set-Cookie", val);
        } else {
          res.setHeader(name, val);
        }
      });

      const buffer = await webRes.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  });

  return app;
}

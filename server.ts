import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createBookPilotApp } from "./server/app";

dotenv.config();

export { createBookPilotApp };

export async function startServer() {
  const app = createBookPilotApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware setup for local development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  return app;
}

startServer().catch((err) => {
  console.error("Fatal server error:", err);
});

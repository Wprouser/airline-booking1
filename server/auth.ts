import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { pool } from "./db/pool.js";

const baseURL = process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL;

// In dev, Vite (5173) proxies /api to Express (3001) — the browser's Origin stays 5173, so it
// must be explicitly trusted even though baseURL points at the API's own port.
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (process.env.RENDER_EXTERNAL_URL && !trustedOrigins.includes(process.env.RENDER_EXTERNAL_URL)) {
  trustedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
});

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  req.user = session.user;
  next();
}

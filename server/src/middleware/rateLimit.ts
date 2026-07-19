import { Request, Response, NextFunction } from "express";

/**
 * Minimal in-memory, per-IP rate limiter for public endpoints.
 *
 * Note: state lives in this process only. On a single long-running server
 * that's fine, but on serverless (Vercel) each instance keeps its own
 * counters, so the effective limit is higher than configured. Treat this as
 * junk-order friction, not as a hard security boundary.
 */
export function rateLimit({
  windowMs,
  max,
  message = "Too many requests, please try again later.",
}: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else if (entry.count >= max) {
      res.status(429);
      next(new Error(message));
      return;
    } else {
      entry.count += 1;
    }

    // Opportunistic cleanup so the map doesn't grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now > v.resetAt) hits.delete(k);
      }
    }

    next();
  };
}

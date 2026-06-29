import { Request, Response, NextFunction } from "express";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403);
  throw new Error("Admin access only");
}
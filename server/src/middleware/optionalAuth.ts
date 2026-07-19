import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

interface JwtPayload {
  id: string;
}

/**
 * Populates `req.user` when a valid session cookie is present, and simply
 * moves on when it isn't. Unlike `protect`, this never rejects the request —
 * use it on public routes that reveal extra data to admins (for example,
 * unlisted products).
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token;
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch {
    // An expired or malformed token just means "treat this as a guest".
  }

  next();
}

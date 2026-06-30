import jwt from "jsonwebtoken";
import { Response } from "express";

export function sendTokenCookie(res: Response, userId: string): void {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = 1000 * 60 * 60 * 24 * 7;
  const token = jwt.sign({ id: userId }, secret, { expiresIn });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: expiresIn,
  });
}
import jwt from "jsonwebtoken";
import { Response } from "express";

export function sendTokenCookie(res: Response, userId: string): void {
    const secret = process.env.JWT_SECRET as string;
    // const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const expiresIn = 1000 * 60 * 60 * 24 * 7;
    const token = jwt.sign({ id: userId }, secret, { expiresIn });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "lax",
    maxAge: expiresIn,
  });
}
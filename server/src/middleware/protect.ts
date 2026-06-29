import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

interface JwtPayload {
  id: string;
}

export async function protect(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401);
    throw new Error("Not authenticated");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error("User no longer exists");
  }

  req.user = user;
  next();
}
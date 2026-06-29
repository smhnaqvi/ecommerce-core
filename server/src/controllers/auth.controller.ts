import { Request, Response } from "express";
import { User } from "../models/user.model";
import { sendTokenCookie } from "../utils/generateToken";

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("Email already in use");
  }

  const user = await User.create({ name, email, password });
  sendTokenCookie(res, user.id);

  res.status(201).json({
    _id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  sendTokenCookie(res, user.id);
  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  });
}

export async function logout(_req: Request, res: Response) {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out" });
}

export async function getMe(req: Request, res: Response) {
  res.json(req.user);
}
<!-- @format -->

# Phase 2 — Auth (TypeScript)

## Context

Phase 1 gave us a running Express + Mongoose server with health check and error handling.
Phase 2 adds **authentication**: users can register and log in, passwords are hashed, and a
**JWT delivered via an http-only cookie** identifies the user on later requests. We also add
two gatekeeping middlewares: `protect` (must be logged in) and `isAdmin` (must be an admin).

**Stack decisions locked in:** http-only cookie token delivery • `bcryptjs` for hashing •
`jsonwebtoken` for tokens • `cookie-parser` to read the cookie.

**Mentoring style:** Explain → you write. Each step states the concept, then you type the code.
Do one step at a time and run the verification at the end before Phase 3.

---

## What we'll end up with

```
server/src/
├── models/
│   └── User.ts                  # schema + password hash hook + comparePassword
├── utils/
│   └── generateToken.ts         # sign JWT and set it as an http-only cookie
├── controllers/
│   └── auth.controller.ts       # register, login, logout, getMe
├── routes/
│   └── auth.routes.ts           # POST /register, /login, /logout; GET /me
├── middleware/
│   ├── protect.ts               # verify JWT from cookie, attach req.user
│   └── isAdmin.ts               # allow only users with isAdmin === true
└── types/
    └── express.d.ts             # add `user` to Express Request type
```

New env vars (`.env` + empty in `.env.example`): `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

---

## Step 1 — Dependencies & env

**Concept:** `bcryptjs` hashes passwords (one-way, never stored in plaintext). `jsonwebtoken`
signs/verifies tokens using `JWT_SECRET`. `cookie-parser` lets Express read `req.cookies`.

Run in `server/`:

```bash
npm install bcryptjs jsonwebtoken cookie-parser
npm install -D @types/bcryptjs @types/jsonwebtoken @types/cookie-parser
```

Add to `server/.env` (real values; gitignored):

```
NODE_ENV=development
JWT_SECRET=<paste output of: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_EXPIRES_IN=7d
```

Add the same keys (empty) to `server/.env.example`.

> Why: anyone who knows `JWT_SECRET` can forge tokens and impersonate any user — keep it out of git.

---

## Step 2 — User model (`src/models/User.ts`)

**Concepts:**
- A Mongoose **schema** defines fields, types, and validation.
- A **`pre('save')` hook** runs before a document saves — we hash the password there, but only
  when it actually changed (so editing a profile later doesn't re-hash an already-hashed value).
- An **instance method** (`comparePassword`) lets us check a login attempt against the hash.
- We type the document with a TS `interface` so the rest of the code gets autocomplete.

```ts
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving, only if it changed.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plaintext attempt against the stored hash.
userSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
```

> Note `select: false` on password — by default queries won't return the hash. We'll explicitly
> ask for it during login with `.select("+password")`.

---

## Step 3 — Token util (`src/utils/generateToken.ts`)

**Concepts:** sign a JWT carrying the user id, then set it as an **http-only cookie**. Http-only
means browser JS cannot read it (XSS protection); the browser still sends it automatically.

```ts
import jwt from "jsonwebtoken";
import { Response } from "express";

export function sendTokenCookie(res: Response, userId: string): void {
  const secret = process.env.JWT_SECRET as string;
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}
```

---

## Step 4 — Extend the Request type (`src/types/express.d.ts`)

**Concept:** `protect` will attach the logged-in user to `req.user`. TypeScript doesn't know that
property exists, so we augment Express's `Request` type once, globally.

```ts
import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
```

If TS doesn't pick it up, ensure `tsconfig.json` includes the `src` folder (it does via `rootDir`),
and that `"typeRoots"` isn't restricting types. Usually no change needed.

---

## Step 5 — Auth controller (`src/controllers/auth.controller.ts`)

**Concepts:** controllers hold the request/response logic. `register` creates a user (password is
hashed by the model hook) and sets the cookie. `login` finds the user *with* the password,
compares, and sets the cookie. `logout` clears the cookie. `getMe` returns the current user.

```ts
import { Request, Response } from "express";
import { User } from "../models/User";
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
```

> Note: `throw new Error(...)` after setting `res.status(...)` is caught by the Phase 1
> `errorHandler`. For async routes to forward thrown errors automatically, see Step 7 note about
> Express 5 (you're on Express 5, which forwards rejected promises for you).

---

## Step 6 — Middleware

`src/middleware/protect.ts` — **Concept:** read the token from the cookie, verify it with the
secret, load the user, attach to `req.user`. If anything fails → 401.

```ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

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
```

`src/middleware/isAdmin.ts` — **Concept:** runs *after* `protect`, so `req.user` exists.

```ts
import { Request, Response, NextFunction } from "express";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403);
  throw new Error("Admin access only");
}
```

---

## Step 7 — Routes + wire into app

`src/routes/auth.routes.ts`:

```ts
import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller";
import { protect } from "../middleware/protect";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
```

In `src/app.ts` add cookie-parser and mount the router:

```ts
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";

// after express.json()
app.use(cookieParser());

// alongside the health router
app.use("/api/auth", authRouter);
```

> Express 5 note: thrown errors inside `async` handlers are forwarded to `errorHandler`
> automatically — no `try/catch` or `express-async-handler` needed.

---

## Verification (end of Phase 2)

Start the server (`npm run dev`), then use a cookie jar with curl so the cookie persists:

```bash
# 1. Register (saves cookie to cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:8800/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sam","email":"sam@test.com","password":"secret123"}'

# 2. Get current user using the saved cookie
curl -i -b cookies.txt http://localhost:8800/api/auth/me

# 3. Logout (clears cookie)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:8800/api/auth/logout

# 4. /me now fails with 401
curl -i -b cookies.txt http://localhost:8800/api/auth/me

# 5. Login again
curl -i -c cookies.txt -X POST http://localhost:8800/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sam@test.com","password":"secret123"}'
```

Checks:
- Register returns 201 + user JSON, and a `Set-Cookie: token=...; HttpOnly` header.
- `/me` returns the user while the cookie is present.
- Wrong password returns 401 with `{ "message": "Invalid email or password" }`.
- The password hash is never present in any JSON response.
- In MongoDB, the stored `password` is a bcrypt hash (starts with `$2`), not plaintext.

To make your first admin: register normally, then in MongoDB set `isAdmin: true` on that user
(e.g. `mongosh` → `db.users.updateOne({email:"sam@test.com"},{$set:{isAdmin:true}})`).

---

## Commit plan (your user, no Claude co-author)

Mirror Phase 1 — one job per commit, in dependency order:

1. `chore(server): add auth dependencies and JWT env config`
2. `feat(server): add User model with password hashing`
3. `feat(server): add JWT cookie token utility`
4. `feat(server): add auth controller (register, login, logout, me)`
5. `feat(server): add protect and isAdmin middleware`
6. `feat(server): mount auth routes and cookie-parser`

---

## Out of scope (later phases)
- Product/Category models and CRUD (Phase 3)
- Cloudinary uploads (Phase 3)
- CORS with credentials for the React apps (Phase 4 — needed for cookies to work cross-origin)
- Forgot/reset password, email verification (Phase 8 polish)
```

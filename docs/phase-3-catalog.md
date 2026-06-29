<!-- @format -->

# Phase 3 — Product & Catalog API (TypeScript)

## Context

Phases 1–2 gave us a running Express + Mongoose server with cookie-based auth and
`protect` / `isAdmin` middleware. Phase 3 builds the **catalog**: a `Category` model and a
`Product` model, full CRUD APIs (public reads, admin-only writes), and **image upload to
Cloudinary**. The storefront (Phase 4) and admin app (Phase 7) will read from these endpoints.

**Decisions locked in:** Cloudinary image upload • separate `Category` model (Product
references it by ObjectId) • flat products (no variants) for v1.

**Mentoring style:** Explain → you write. Each step states the concept, then you type the code.
Do one step at a time and run the verification at the end before Phase 4.

---

## What we'll end up with

```
server/src/
├── config/cloudinary.ts            # configure Cloudinary SDK from env
├── middleware/upload.ts            # multer memoryStorage, image-only filter
├── utils/uploadToCloudinary.ts     # stream a buffer to Cloudinary -> secure_url
├── models/category.model.ts        # name, slug, description
├── models/product.model.ts         # name, slug, desc, price, category(ref), images[], stock
├── controllers/category.controller.ts
├── controllers/product.controller.ts
├── routes/category.routes.ts
└── routes/product.routes.ts
```

New env vars (`.env` + empty keys in `.env.example`): `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## Step 1 — Dependencies & Cloudinary env

**Concept:** We never store image bytes in MongoDB — that bloats the DB and is slow to serve.
Instead we upload the file to Cloudinary (a media CDN), and store only the returned
`secure_url` string on the product. `multer` parses the incoming multipart upload;
`cloudinary` is the SDK that pushes the bytes to the CDN.

Run in `server/`:

```bash
npm install cloudinary multer
npm install -D @types/multer
```

Create a free account at cloudinary.com → Dashboard shows **Cloud name**, **API Key**,
**API Secret**. Add to `server/.env` (gitignored):

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Add the same keys (empty) to `server/.env.example`.

---

## Step 2 — Cloudinary config + upload middleware + helper

**`src/config/cloudinary.ts`** — configure the SDK once from env:

```ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

**`src/middleware/upload.ts`** — multer in memory (no disk), images only, size cap:

```ts
import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});
```

**`src/utils/uploadToCloudinary.ts`** — multer gives us a Buffer in memory; Cloudinary's SDK
wants a stream. We wrap `upload_stream` in a Promise that resolves to the hosted URL:

```ts
import cloudinary from "../config/cloudinary";

export function uploadToCloudinary(
  buffer: Buffer,
  folder = "buraq/products"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
```

> Concept: `upload_stream` returns a writable stream; we pump the in-memory buffer into it with
> `stream.end(buffer)`. The callback fires once Cloudinary responds with the hosted file info.

---

## Step 3 — Category model + CRUD

**`src/models/category.model.ts`** — note the auto-slug hook (slug = URL-friendly name):

```ts
import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// Build a slug from the name whenever the name changes.
categorySchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export const Category = mongoose.model<ICategory>("Category", categorySchema);
```

> Why `pre("validate")` not `pre("save")`? `slug` is `required`, and validation runs before save —
> generating it in `validate` guarantees it exists before the required check.

**`src/controllers/category.controller.ts`:**

```ts
import { Request, Response } from "express";
import { Category } from "../models/category.model";

export async function listCategories(_req: Request, res: Response) {
  const categories = await Category.find().sort("name");
  res.json(categories);
}

export async function getCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json(category);
}

export async function createCategory(req: Request, res: Response) {
  const { name, description } = req.body;
  const category = await Category.create({ name, description });
  res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  category.name = req.body.name ?? category.name;
  category.description = req.body.description ?? category.description;
  await category.save(); // triggers slug hook
  res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ message: "Category deleted" });
}
```

**`src/routes/category.routes.ts`** — public reads, admin writes:

```ts
import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";

const router = Router();

router.get("/", listCategories);
router.get("/:id", getCategory);
router.post("/", protect, isAdmin, createCategory);
router.put("/:id", protect, isAdmin, updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

export default router;
```

---

## Step 4 — Product model

**`src/models/product.model.ts`:**

```ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: Types.ObjectId;
  images: string[];
  countInStock: number;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [] },
    countInStock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
```

> Concept — **reference vs embed**: `category` stores the Category's `ObjectId` (a reference).
> On reads we call `.populate("category")` to swap that id for the full Category document. We
> reference (not embed) because a category is shared across many products and may be renamed.

---

## Step 5 — Product controller

```ts
import { Request, Response } from "express";
import { Product } from "../models/product.model";
import { Category } from "../models/category.model";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";

// GET /api/products?category=&search=&page=&limit=&sort=
export async function listProducts(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const filter: Record<string, unknown> = { isActive: true };

  if (req.query.search) {
    filter.name = { $regex: String(req.query.search), $options: "i" };
  }

  // category may arrive as a slug (storefront) or an id (admin)
  if (req.query.category) {
    const raw = String(req.query.category);
    const cat = await Category.findOne({ slug: raw });
    filter.category = cat ? cat._id : raw;
  }

  const total = await Product.countDocuments(filter);
  const items = await Product.find(filter)
    .populate("category", "name slug")
    .sort(String(req.query.sort || "-createdAt"))
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ items, page, pages: Math.ceil(total / limit), total });
}

export async function getProductBySlug(req: Request, res: Response) {
  const product = await Product.findOne({ slug: req.params.slug }).populate(
    "category",
    "name slug"
  );
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const { name, description, price, category, countInStock } = req.body;

  // req.files is populated by upload.array("images")
  const files = (req.files as Express.Multer.File[]) || [];
  const images = await Promise.all(
    files.map((f) => uploadToCloudinary(f.buffer))
  );

  const product = await Product.create({
    name,
    description,
    price,
    category,
    countInStock,
    images,
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { name, description, price, category, countInStock } = req.body;
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (countInStock !== undefined) product.countInStock = countInStock;

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length) {
    const newImages = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer))
    );
    product.images = [...product.images, ...newImages];
  }

  await product.save();
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ message: "Product deleted" });
}
```

> Concept — **cap the limit**: `Math.min(50, ...)` stops a client requesting `?limit=100000` and
> hammering the DB. Always sanitize pagination input.

---

## Step 6 — Product routes

**`src/routes/product.routes.ts`:**

```ts
import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", listProducts);
router.get("/:slug", getProductBySlug);
router.post("/", protect, isAdmin, upload.array("images", 5), createProduct);
router.put("/:id", protect, isAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

export default router;
```

> Order matters: `protect` → `isAdmin` → `upload.array` → controller. We authenticate before
> spending effort parsing/uploading files. `upload.array("images", 5)` accepts up to 5 files
> from a form field named `images`.

---

## Step 7 — Mount in `app.ts`

Add alongside the existing routers (after `cookieParser`):

```ts
import categoryRouter from "./routes/category.routes";
import productRouter from "./routes/product.routes";

app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
```

---

## Verification (end of Phase 3)

Server running (`npm run dev`, port 8800). You need an admin: register a user (Phase 2), then in
`mongosh` run `db.users.updateOne({email:"sam@test.com"},{$set:{isAdmin:true}})`, and log in
again to refresh the cookie. Use the `-b cookies.txt` cookie jar from Phase 2.

```bash
# 1. Create a category (admin) -> 201, note the returned _id
curl -b cookies.txt -X POST http://localhost:8800/api/categories \
  -H "Content-Type: application/json" -d '{"name":"Shoes"}'

# 2. Create a product with an image (multipart). Use a real image path.
curl -b cookies.txt -X POST http://localhost:8800/api/products \
  -F name="Air Runner" -F price=120 -F countInStock=10 \
  -F category=<categoryId> -F images=@./test.jpg

# 3. Public list (no auth) -> { items, page, pages, total }
curl http://localhost:8800/api/products

# 4. Filter by category slug + search + pagination
curl "http://localhost:8800/api/products?category=shoes&search=run&page=1&limit=10"

# 5. Get one by slug -> product with populated category
curl http://localhost:8800/api/products/air-runner
```

Checks:
- Step 2 response `images[0]` is a `https://res.cloudinary.com/...` URL (and the file appears in
  your Cloudinary Media Library under `buraq/products`).
- Step 3/4/5 work **without** a cookie (public reads).
- Repeat step 2 **without** `-b cookies.txt` (or as a non-admin) → **403** "Admin access only".
- Send a non-image (`-F images=@./notes.txt`) → rejected by the multer fileFilter.

---

## Commit plan (your user, no Claude co-author)
1. `chore(server): add cloudinary + multer deps and env`
2. `feat(server): add cloudinary config and image upload helper`
3. `feat(server): add Category model and CRUD API`
4. `feat(server): add Product model`
5. `feat(server): add Product CRUD API with image upload`
6. `feat(server): mount category and product routes`
7. `docs: add Phase 3 catalog implementation guide`

---

## Out of scope (later phases)
- Cart & Orders (Phase 5), Stripe (Phase 6)
- Variants, reviews, text search indexing (Phase 8)
- **TODO (optional polish):** delete Cloudinary images when a product is deleted (store each
  image's `public_id` alongside the URL, then call `cloudinary.uploader.destroy`).
```

import { Request, Response } from "express";
import { Product } from "../models/product.model";
import { Category } from "../models/category.model";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";

// GET /api/products?category=&search=&page=&limit=&sort=
export async function listProducts(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const filter: Record<string, unknown> = { isActive: true };

  // Unlisted products are landing-page-only, so they stay out of the
  // storefront. Admins can opt back in with ?includeHidden=true.
  const isAdminViewer = Boolean(req.user?.isAdmin);
  if (!isAdminViewer || req.query.includeHidden !== "true") {
    filter.isListed = { $ne: false };
  }

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

  // An unlisted product must not be browsable by slug either, or it isn't
  // really hidden. Admins still need it for the edit screen.
  if (product.isListed === false && !req.user?.isAdmin) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const { name, description, price, category, countInStock, isListed } = req.body;

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
    // Lets a landing-only product be created hidden from the start.
    isListed: isListed === undefined ? true : isListed === true || isListed === "true",
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { name, description, price, category, countInStock, isActive, isListed } =
    req.body;
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (countInStock !== undefined) product.countInStock = countInStock;
  // multipart/form-data sends booleans as strings, so compare loosely.
  if (isActive !== undefined) product.isActive = isActive === true || isActive === "true";
  if (isListed !== undefined) product.isListed = isListed === true || isListed === "true";

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




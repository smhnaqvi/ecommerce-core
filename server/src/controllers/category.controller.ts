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


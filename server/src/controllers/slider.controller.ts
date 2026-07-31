import { Request, Response } from "express";
import { Slider } from "../models/slider.model";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";

// GET /api/sliders — public, active slides only, ordered
export async function listSliders(_req: Request, res: Response) {
  const sliders = await Slider.find({ isActive: true }).sort("order");
  res.json(sliders);
}

// GET /api/sliders/admin — admin, all slides including inactive
export async function listAllSliders(_req: Request, res: Response) {
  const sliders = await Slider.find().sort("order");
  res.json(sliders);
}

export async function getSlider(req: Request, res: Response) {
  const slider = await Slider.findById(req.params.id);
  if (!slider) {
    res.status(404);
    throw new Error("Slider not found");
  }
  res.json(slider);
}

export async function createSlider(req: Request, res: Response) {
  const { title, subtitle, link, order, isActive } = req.body;

  const file = (req.file as Express.Multer.File) || undefined;
  if (!file) {
    res.status(400);
    throw new Error("Slider image is required");
  }
  const imageUrl = await uploadToCloudinary(file.buffer, "buraq/sliders");

  const slider = await Slider.create({
    imageUrl,
    title,
    subtitle,
    link,
    order,
    isActive,
  });
  res.status(201).json(slider);
}

export async function updateSlider(req: Request, res: Response) {
  const slider = await Slider.findById(req.params.id);
  if (!slider) {
    res.status(404);
    throw new Error("Slider not found");
  }

  const { title, subtitle, link, order, isActive } = req.body;
  if (title !== undefined) slider.title = title;
  if (subtitle !== undefined) slider.subtitle = subtitle;
  if (link !== undefined) slider.link = link;
  if (order !== undefined) slider.order = order;
  if (isActive !== undefined) slider.isActive = isActive === "true" || isActive === true;

  const file = (req.file as Express.Multer.File) || undefined;
  if (file) {
    slider.imageUrl = await uploadToCloudinary(file.buffer, "buraq/sliders");
  }

  await slider.save();
  res.json(slider);
}

export async function deleteSlider(req: Request, res: Response) {
  const slider = await Slider.findByIdAndDelete(req.params.id);
  if (!slider) {
    res.status(404);
    throw new Error("Slider not found");
  }
  res.json({ message: "Slider deleted" });
}

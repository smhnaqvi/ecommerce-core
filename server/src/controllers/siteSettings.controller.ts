import { Request, Response } from "express";
import { SiteSettings } from "../models/siteSettings.model";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";

async function getOrCreateSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({});
  }
  return settings;
}

export async function getSiteSettings(_req: Request, res: Response) {
  const settings = await getOrCreateSettings();
  res.json(settings);
}

export async function updateSiteSettings(req: Request, res: Response) {
  const settings = await getOrCreateSettings();

  const files = (req.files as
    | { [field: string]: Express.Multer.File[] }
    | undefined) ?? {};

  if (files.logo?.[0]) {
    settings.logoUrl = await uploadToCloudinary(
      files.logo[0].buffer,
      "buraq/site-settings"
    );
  }

  if (req.body.footer !== undefined) {
    settings.footer = JSON.parse(req.body.footer);
  }

  if (req.body.theme !== undefined) {
    settings.theme = JSON.parse(req.body.theme);
  }

  await settings.save();
  res.json(settings);
}

import mongoose, { Document, Schema } from "mongoose";

export interface ISlider extends Document {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  order: number;
  isActive: boolean;
}

const sliderSchema = new Schema<ISlider>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    link: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Slider = mongoose.model<ISlider>("Slider", sliderSchema);

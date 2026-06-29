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




import { fileTypeFromBuffer } from "file-type";

const allowedExts = ["jpg", "jpeg", "png", "webp"];

export async function validateImageBuffer(buffer) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !allowedExts.includes(type.ext)) {
    throw new Error("Invalid image file");
  }
  return type; 
}

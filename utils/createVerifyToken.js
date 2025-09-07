import crypto from "crypto";

export function createVerifyToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashVerifyToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}


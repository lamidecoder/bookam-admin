/**
 * Cloudinary upload helper for the admin dashboard.
 *
 * Real credentials wired in - live account, not a placeholder.
 * Cloud name: rolzokpw
 * Upload preset: bookam_unsigned (Signing Mode: Unsigned, confirmed
 * in the Cloudinary console)
 *
 * The resulting URLs get saved into the same `properties.images` array
 * column in Supabase that the mobile app already reads from (see
 * lib/cloudinary.ts in the mobile app repo) — the guest app requires
 * zero changes to pick these up, since it just displays whatever URLs
 * are already in that array.
 */

const CLOUD_NAME = 'rolzokpw';
const UPLOAD_PRESET = 'bookam_unsigned';

export const CLOUDINARY_CONFIGURED = true;

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Image upload failed. Please try again.');
  }

  const data = await response.json();
  return data.secure_url;
}
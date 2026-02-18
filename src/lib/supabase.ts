import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const INVENTORY_BUCKET = "inventory-photos";
export const PRESCRIPTION_SCANS_BUCKET = "prescription-scans";

export async function ensureInventoryBucket() {
  await supabaseAdmin.storage.createBucket(INVENTORY_BUCKET, {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  // Ignore error — bucket likely already exists
}

export async function ensurePrescriptionBucket() {
  await supabaseAdmin.storage.createBucket(PRESCRIPTION_SCANS_BUCKET, {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  });
  // Ignore error — bucket likely already exists
}

export async function uploadPrescriptionScan(
  base64: string,
  mimeType: string,
  customerId: string
): Promise<string | null> {
  await ensurePrescriptionBucket();

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `${customerId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const { data, error } = await supabaseAdmin.storage
    .from(PRESCRIPTION_SCANS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error || !data) return null;

  const { data: urlData } = supabaseAdmin.storage
    .from(PRESCRIPTION_SCANS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function uploadInventoryPhoto(
  file: File,
  itemId: string
): Promise<string | null> {
  await ensureInventoryBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${itemId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { data, error } = await supabaseAdmin.storage
    .from(INVENTORY_BUCKET)
    .upload(path, Buffer.from(bytes), {
      contentType: file.type,
      upsert: true,
    });

  if (error || !data) return null;

  const { data: urlData } = supabaseAdmin.storage
    .from(INVENTORY_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

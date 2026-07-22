import { getBlob, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export function validateLeaveAttachment(file) {
  if (!file) return "";
  if (!ALLOWED_TYPES.has(file.type)) return "ឯកសារត្រូវជា PDF, JPG, PNG ឬ WEBP";
  if (file.size > MAX_BYTES) return "ឯកសារមិនអាចធំជាង 5MB";
  return "";
}

export async function uploadLeaveAttachment(file, employeeUid, requestId) {
  const error = validateLeaveAttachment(file);
  if (error) throw new Error(error);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `leaveAttachments/${employeeUid}/${requestId}/${Date.now()}-${safeName}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return { path, name: file.name, type: file.type, size: file.size };
}

export async function downloadLeaveAttachment(attachment) {
  if (!attachment?.path) return;
  const blob = await getBlob(ref(storage, attachment.path));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.name || "leave-attachment";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "../firebase/config";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10;

export function validateLoanFiles(files = [], existingCount = 0) {
  const rows = Array.from(files || []);
  if (rows.length + existingCount > MAX_FILES) return `អាចភ្ជាប់ឯកសារបានអតិបរមា ${MAX_FILES}`;
  for (const file of rows) {
    if (!ALLOWED_TYPES.has(file.type)) return "ឯកសារត្រូវជា PDF, JPG, PNG ឬ WEBP";
    if (file.size > MAX_BYTES) return "ឯកសារនីមួយៗមិនអាចធំជាង 5MB";
  }
  return "";
}

export async function uploadLoanFiles(files = [], uploadId) {
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const rows = Array.from(files || []);
  const error = validateLoanFiles(rows);
  if (error) throw new Error(error);
  const results = [];
  for (const file of rows) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `loanAttachments/${user.uid}/${uploadId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
    await uploadBytes(ref(storage, path), file, { contentType: file.type });
    results.push({
      path,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedByUid: user.uid,
      uploadedByEmail: user.email || "",
    });
  }
  return results;
}

export async function deleteLoanAttachment(attachment) {
  if (!attachment?.path) return;
  await deleteObject(ref(storage, attachment.path));
}

export async function downloadLoanAttachment(attachment) {
  if (!attachment?.path) return;
  const blob = await getBlob(ref(storage, attachment.path));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.name || "loan-attachment";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

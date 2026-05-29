import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

// Files (student PDFs, payment receipts, product images) live in Netlify Blobs.
// Strong consistency so a freshly uploaded blob is immediately readable in the
// next request (e.g. upload → promote, or submit → shopkeeper views receipt).
function store() {
  return getStore({ name: "printly-files", consistency: "strong" });
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Save a freshly uploaded file under a temp key; returns an opaque token. */
export async function saveTmpFile(bytes: Buffer, ext: string): Promise<string> {
  const token = `${randomUUID()}${ext}`;
  await store().set(`tmp/${token}`, toArrayBuffer(bytes));
  return token;
}

/** Read a temp upload back (null if it's gone). */
export async function readTmp(token: string): Promise<Buffer | null> {
  const ab = (await store().get(`tmp/${token}`, { type: "arrayBuffer" })) as ArrayBuffer | null;
  return ab ? Buffer.from(ab) : null;
}

/** Move a temp upload into a job's namespace. Returns the stored key. */
export async function promoteTmpToJob(token: string, jobId: string, filename: string): Promise<string> {
  const s = store();
  const ab = (await s.get(`tmp/${token}`, { type: "arrayBuffer" })) as ArrayBuffer | null;
  if (!ab) throw new Error("Upload not found");
  const key = `jobs/${jobId}/${filename}`;
  await s.set(key, ab);
  await s.delete(`tmp/${token}`);
  return key;
}

/** Save a file into a print job's namespace (e.g. its receipt). */
export async function saveJobFile(jobId: string, filename: string, bytes: Buffer): Promise<string> {
  const key = `jobs/${jobId}/${filename}`;
  await store().set(key, toArrayBuffer(bytes));
  return key;
}

/** Save a file into a store order's namespace (e.g. its receipt). */
export async function saveOrderFile(orderId: string, filename: string, bytes: Buffer): Promise<string> {
  const key = `orders/${orderId}/${filename}`;
  await store().set(key, toArrayBuffer(bytes));
  return key;
}

/** Save a product catalog image. Returns the stored key. */
export async function saveProductImage(productId: string, filename: string, bytes: Buffer): Promise<string> {
  const key = `products/${productId}/${filename}`;
  await store().set(key, toArrayBuffer(bytes));
  return key;
}

/** Read a stored blob by key. Throws if missing. */
export async function readStored(key: string): Promise<Buffer> {
  const ab = (await store().get(key, { type: "arrayBuffer" })) as ArrayBuffer | null;
  if (!ab) throw new Error("File not found");
  return Buffer.from(ab);
}

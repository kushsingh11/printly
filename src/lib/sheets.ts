import type {
  Notification,
  PrintJob,
  Product,
  Settings,
  ShopOrder,
  User,
  WithStudent,
  PrintStatus,
} from "@/lib/types";

// Server-only client for the Google Sheets backend (Apps Script JSON API).
const API_URL = process.env.APPS_SCRIPT_URL;
const API_SECRET = process.env.API_SECRET;

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!API_URL || !API_SECRET) throw new Error("Sheets API not configured (APPS_SCRIPT_URL / API_SECRET).");
  // GET avoids Apps Script's POST->302 redirect (~1s faster). Server-to-server
  // only, so the secret in the query string never reaches a browser.
  const qs = new URLSearchParams({
    action,
    secret: API_SECRET,
    payload: JSON.stringify(payload),
  });
  const res = await fetch(`${API_URL}?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error || "Sheets API error");
  return json.data as T;
}

// --- date helpers (API returns ISO strings) ---
const d = (s: unknown): Date => new Date(String(s));
const dn = (s: unknown): Date | null => (s ? new Date(String(s)) : null);

type RawJob = Omit<PrintJob, "paidAt" | "createdAt" | "updatedAt"> & {
  paidAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};
function mapJob<T extends RawJob>(j: T): PrintJob & Omit<T, keyof RawJob> {
  return { ...j, paidAt: dn(j.paidAt), createdAt: d(j.createdAt), updatedAt: dn(j.updatedAt) };
}
type RawOrder = Omit<ShopOrder, "paidAt" | "createdAt"> & { paidAt: string | null; createdAt: string };
function mapOrder<T extends RawOrder>(o: T): ShopOrder & Omit<T, keyof RawOrder> {
  return { ...o, paidAt: dn(o.paidAt), createdAt: d(o.createdAt) };
}

// ---------- Auth / users ----------
export function getUserByEmail(email: string): Promise<User | null> {
  return call("getUserByEmail", { email });
}
export function createUser(u: {
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role?: string;
}): Promise<{ id: string }> {
  return call("createUser", u);
}

// ---------- Settings ----------
export function getSettings(): Promise<Settings> {
  return call("getSettings");
}
export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return call("updateSettings", patch);
}

// ---------- Products ----------
export function listProducts(visibleOnly = false): Promise<Product[]> {
  return call("listProducts", { visibleOnly });
}
export function getProduct(id: string): Promise<Product | null> {
  return call("getProduct", { id });
}
export function createProduct(p: Record<string, unknown>): Promise<{ id: string; sku: string }> {
  return call("createProduct", p);
}
export function updateProduct(p: Record<string, unknown>): Promise<{ ok: true }> {
  return call("updateProduct", p);
}
export function listCategories(): Promise<string[]> {
  return call("listCategories");
}

// ---------- Print jobs ----------
export async function createPrintJob(p: Record<string, unknown>): Promise<{ id: string; code: string }> {
  return call("createPrintJob", p);
}
export async function getPrintJob(id: string): Promise<PrintJob | null> {
  const j = await call<RawJob | null>("getPrintJob", { id });
  return j ? mapJob(j) : null;
}
export async function listPrintJobsByStudent(email: string): Promise<PrintJob[]> {
  return (await call<RawJob[]>("listPrintJobsByStudent", { email })).map(mapJob);
}
export function submitPrintReceipt(p: { id: string; upiRef: string; receiptKey: string }): Promise<{ ok: true }> {
  return call("submitPrintReceipt", p);
}
export async function queueData(): Promise<{
  toVerify: WithStudent<PrintJob>[];
  active: WithStudent<PrintJob>[];
  pickedUp: WithStudent<PrintJob>[];
  stats: { queued: number; printing: number; ready: number; todayRevenue: number };
}> {
  const q = await call<{
    toVerify: (RawJob & { studentName: string })[];
    active: (RawJob & { studentName: string })[];
    pickedUp: (RawJob & { studentName: string })[];
    stats: { queued: number; printing: number; ready: number; todayRevenue: number };
  }>("queueData");
  return { ...q, toVerify: q.toVerify.map(mapJob), active: q.active.map(mapJob), pickedUp: q.pickedUp.map(mapJob) };
}
export function verifyPrintPayment(id: string): Promise<{ ok: true }> {
  return call("verifyPrintPayment", { id });
}
export function rejectPrintPayment(id: string): Promise<{ ok: true }> {
  return call("rejectPrintPayment", { id });
}
export function advancePrintJob(id: string, to: PrintStatus): Promise<{ ok: true }> {
  return call("advancePrintJob", { id, to });
}

// ---------- Orders ----------
export function createOrder(p: {
  studentEmail: string;
  items: { productId: string; qty: number }[];
}): Promise<{ id: string; code: string; total: number }> {
  return call("createOrder", p);
}
export async function getOrder(id: string): Promise<ShopOrder | null> {
  const o = await call<RawOrder | null>("getOrder", { id });
  return o ? mapOrder(o) : null;
}
export async function listOrdersByStudent(email: string): Promise<ShopOrder[]> {
  return (await call<RawOrder[]>("listOrdersByStudent", { email })).map(mapOrder);
}
export function submitOrderReceipt(p: { id: string; upiRef: string; receiptKey: string }): Promise<{ ok: true }> {
  return call("submitOrderReceipt", p);
}
export async function shopOrdersData(): Promise<{
  toVerify: WithStudent<ShopOrder>[];
  ready: WithStudent<ShopOrder>[];
  pickedUp: WithStudent<ShopOrder>[];
  stats: { pendingPickups: number; pendingValue: number; todayRevenue: number };
}> {
  const s = await call<{
    toVerify: (RawOrder & { studentName: string })[];
    ready: (RawOrder & { studentName: string })[];
    pickedUp: (RawOrder & { studentName: string })[];
    stats: { pendingPickups: number; pendingValue: number; todayRevenue: number };
  }>("shopOrdersData");
  return { ...s, toVerify: s.toVerify.map(mapOrder), ready: s.ready.map(mapOrder), pickedUp: s.pickedUp.map(mapOrder) };
}
export function verifyOrderPayment(id: string): Promise<{ ok: true }> {
  return call("verifyOrderPayment", { id });
}
export function rejectOrderPayment(id: string): Promise<{ ok: true }> {
  return call("rejectOrderPayment", { id });
}
export function markOrderPickedUp(id: string): Promise<{ ok: true }> {
  return call("markOrderPickedUp", { id });
}

// ---------- Notifications ----------
export async function listNotifications(email: string): Promise<Notification[]> {
  const ns = await call<(Omit<Notification, "createdAt"> & { createdAt: string })[]>("listNotifications", { email });
  return ns.map((n) => ({ ...n, createdAt: d(n.createdAt) }));
}
export async function unreadCount(email: string): Promise<number> {
  return (await call<{ count: number }>("unreadCount", { email })).count;
}
export function markAllRead(email: string): Promise<{ ok: true }> {
  return call("markAllRead", { email });
}

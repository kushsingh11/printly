import { unstable_cache } from "next/cache";
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
  const qs = new URLSearchParams({ action, secret: API_SECRET, payload: JSON.stringify(payload) });
  const res = await fetch(`${API_URL}?${qs.toString()}`, { method: "GET", cache: "no-store", redirect: "follow" });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error || "Sheets API error");
  return json.data as T;
}

// Cache reads in the Next.js Data Cache. Mutations call revalidateTag(...) (see
// CACHE_TAGS) to bust the relevant tag instantly; the TTL is a safety net for
// edits made directly in the spreadsheet.
const TTL = 30;
export const CACHE_TAGS = {
  settings: "settings",
  products: "products",
  printjobs: "printjobs",
  orders: "orders",
  notifications: "notifications",
} as const;

function cached<A extends unknown[], T>(fn: (...args: A) => Promise<T>, key: string, tag: string, ttl = TTL) {
  return unstable_cache(fn, [key], { tags: [tag], revalidate: ttl });
}

// --- date helpers (API returns ISO strings; map AFTER the cache) ---
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

// ---------- Auth / users (NOT cached — must reflect new signups immediately) ----------
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
const _getSettings = cached(() => call<Settings>("getSettings"), "settings", CACHE_TAGS.settings);
export function getSettings(): Promise<Settings> {
  return _getSettings();
}
export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return call("updateSettings", patch);
}

// ---------- Products ----------
const _listProducts = cached((v: boolean) => call<Product[]>("listProducts", { visibleOnly: v }), "products-list", CACHE_TAGS.products);
export function listProducts(visibleOnly = false): Promise<Product[]> {
  return _listProducts(visibleOnly);
}
const _getProduct = cached((id: string) => call<Product | null>("getProduct", { id }), "product", CACHE_TAGS.products);
export function getProduct(id: string): Promise<Product | null> {
  return _getProduct(id);
}
const _listCategories = cached(() => call<string[]>("listCategories"), "categories", CACHE_TAGS.products);
export function listCategories(): Promise<string[]> {
  return _listCategories();
}
export function createProduct(p: Record<string, unknown>): Promise<{ id: string; sku: string }> {
  return call("createProduct", p);
}
export function updateProduct(p: Record<string, unknown>): Promise<{ ok: true }> {
  return call("updateProduct", p);
}

// ---------- Print jobs ----------
export function createPrintJob(p: Record<string, unknown>): Promise<{ id: string; code: string }> {
  return call("createPrintJob", p);
}
const _getPrintJob = cached((id: string) => call<RawJob | null>("getPrintJob", { id }), "printjob", CACHE_TAGS.printjobs);
export async function getPrintJob(id: string): Promise<PrintJob | null> {
  const j = await _getPrintJob(id);
  return j ? mapJob(j) : null;
}
const _listPrintJobsByStudent = cached((email: string) => call<RawJob[]>("listPrintJobsByStudent", { email }), "printjobs-student", CACHE_TAGS.printjobs);
export async function listPrintJobsByStudent(email: string): Promise<PrintJob[]> {
  return (await _listPrintJobsByStudent(email)).map(mapJob);
}
export function submitPrintReceipt(p: { id: string; upiRef: string; receiptKey: string }): Promise<{ ok: true }> {
  return call("submitPrintReceipt", p);
}
type RawQueue = {
  toVerify: (RawJob & { studentName: string })[];
  active: (RawJob & { studentName: string })[];
  pickedUp: (RawJob & { studentName: string })[];
  stats: { queued: number; printing: number; ready: number; todayRevenue: number };
};
const _queueData = cached(() => call<RawQueue>("queueData"), "queue", CACHE_TAGS.printjobs, 30);
export async function queueData(): Promise<{
  toVerify: WithStudent<PrintJob>[];
  active: WithStudent<PrintJob>[];
  pickedUp: WithStudent<PrintJob>[];
  stats: RawQueue["stats"];
}> {
  const q = await _queueData();
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
const _getOrder = cached((id: string) => call<RawOrder | null>("getOrder", { id }), "order", CACHE_TAGS.orders);
export async function getOrder(id: string): Promise<ShopOrder | null> {
  const o = await _getOrder(id);
  return o ? mapOrder(o) : null;
}
const _listOrdersByStudent = cached((email: string) => call<RawOrder[]>("listOrdersByStudent", { email }), "orders-student", CACHE_TAGS.orders);
export async function listOrdersByStudent(email: string): Promise<ShopOrder[]> {
  return (await _listOrdersByStudent(email)).map(mapOrder);
}
export function submitOrderReceipt(p: { id: string; upiRef: string; receiptKey: string }): Promise<{ ok: true }> {
  return call("submitOrderReceipt", p);
}
type RawShopOrders = {
  toVerify: (RawOrder & { studentName: string })[];
  ready: (RawOrder & { studentName: string })[];
  pickedUp: (RawOrder & { studentName: string })[];
  stats: { pendingPickups: number; pendingValue: number; todayRevenue: number };
};
const _shopOrdersData = cached(() => call<RawShopOrders>("shopOrdersData"), "shoporders", CACHE_TAGS.orders, 30);
export async function shopOrdersData(): Promise<{
  toVerify: WithStudent<ShopOrder>[];
  ready: WithStudent<ShopOrder>[];
  pickedUp: WithStudent<ShopOrder>[];
  stats: RawShopOrders["stats"];
}> {
  const s = await _shopOrdersData();
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
type RawNotif = Omit<Notification, "createdAt"> & { createdAt: string };
const _listNotifications = cached((email: string) => call<RawNotif[]>("listNotifications", { email }), "notifs", CACHE_TAGS.notifications, 20);
export async function listNotifications(email: string): Promise<Notification[]> {
  return (await _listNotifications(email)).map((n) => ({ ...n, createdAt: d(n.createdAt) }));
}
const _unreadCount = cached((email: string) => call<{ count: number }>("unreadCount", { email }), "unread", CACHE_TAGS.notifications, 20);
export async function unreadCount(email: string): Promise<number> {
  return (await _unreadCount(email)).count;
}
export function markAllRead(email: string): Promise<{ ok: true }> {
  return call("markAllRead", { email });
}

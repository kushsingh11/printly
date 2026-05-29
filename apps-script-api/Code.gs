/**
 * Printly — Google Sheets JSON API (called by the Next.js server).
 * Bound to a Printly spreadsheet. Secret-guarded: every request must include
 * the shared secret stored in Script Properties as API_SECRET.
 *
 * Setup:
 *   1. Paste into a bound Apps Script (Extensions > Apps Script on the sheet).
 *   2. Project Settings > Script properties > add API_SECRET = <a long random string>.
 *   3. Run setup() once (authorize).
 *   4. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone). Copy the /exec URL.
 *
 * Money is stored in paise (integers). ₹95 = 9500.
 */

// ---------- Web entry ----------
// Handles both GET (fast: ?action=&payload=&secret=) and POST (JSON body).
// The Next.js server uses GET to avoid Apps Script's slow POST->302 redirect.
function doGet(e) {
  return handle_(e);
}
function doPost(e) {
  return handle_(e);
}
function handle_(e) {
  try {
    let body;
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      const p = (e && e.parameter) || {};
      body = { secret: p.secret, action: p.action, payload: p.payload ? JSON.parse(p.payload) : {} };
    }
    if (!body.action) return json_({ ok: true, data: "Printly Sheets API" });
    if (!body.secret || body.secret !== getSecret_()) return json_({ ok: false, error: "unauthorized" });
    const fn = HANDLERS[body.action];
    if (!fn) return json_({ ok: false, error: "unknown action: " + body.action });
    return json_({ ok: true, data: fn(body.payload || {}) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty("API_SECRET") || "";
}

// ---------- Sheet helpers ----------
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("Missing tab: " + name + " (run setup())");
  return sh;
}
function table_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const items = [];
  for (let i = 1; i < values.length; i++) {
    const o = { _row: i + 1 };
    headers.forEach((h, c) => (o[h] = values[i][c]));
    items.push(o);
  }
  return { sh, headers, items };
}
function append_(name, obj) {
  const { sh, headers } = table_(name);
  sh.appendRow(headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : "")));
  return obj;
}
function update_(name, row, patch) {
  const { sh, headers } = table_(name);
  Object.keys(patch).forEach((k) => {
    const c = headers.indexOf(k);
    if (c >= 0) sh.getRange(row, c + 1).setValue(patch[k]);
  });
}
function findRow_(name, field, value) {
  return table_(name).items.find((r) => String(r[field]) === String(value)) || null;
}
function uuid_() { return Utilities.getUuid(); }
function nowIso_() { return new Date().toISOString(); }
function startOfTodayIso_() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }

function nextSeq_(name, start) {
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const props = PropertiesService.getScriptProperties();
    const key = "SEQ_" + name;
    let n = Number(props.getProperty(key) || start);
    n++;
    props.setProperty(key, String(n));
    return n;
  } finally {
    lock.releaseLock();
  }
}

// ---------- Settings ----------
const NUMERIC_SETTINGS = [
  "bwPerPage", "colorPerPage", "doubleSidedSurcharge", "a3Surcharge",
  "stapleFee", "spiralFee", "coverPageFee", "rushPercent", "freeSpiralAbove",
];
const BOOL_SETTINGS = ["acceptingJobs", "allowCashOnCollection", "autoEmailWhenReady"];

function settingsObj_() {
  const o = {};
  table_("Settings").items.forEach((r) => (o[r.Key] = r.Value));
  NUMERIC_SETTINGS.forEach((k) => (o[k] = Number(o[k]) || 0));
  BOOL_SETTINGS.forEach((k) => (o[k] = String(o[k]).toLowerCase() === "true"));
  return o;
}
function setSetting_(k, v) {
  const r = findRow_("Settings", "Key", k);
  if (r) sheet_("Settings").getRange(r._row, 2).setValue(v);
  else sheet_("Settings").appendRow([k, v]);
}

// ---------- Row mappers ----------
function jobOut_(r) {
  return {
    id: r.id, code: r.code, studentEmail: r.studentEmail, fileName: r.fileName, fileKey: r.fileKey,
    pageCount: Number(r.pageCount) || 0, copies: Number(r.copies) || 1, color: r.color, sided: r.sided,
    paperSize: r.paperSize, binding: r.binding, coverPage: r.coverPage === true || r.coverPage === "true",
    rush: r.rush === true || r.rush === "true", amount: Number(r.amount) || 0, paymentStatus: r.paymentStatus,
    receiptKey: r.receiptKey || null, upiRef: r.upiRef || null, paidAt: r.paidAt || null, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}
function productOut_(r) {
  return {
    id: r.id, sku: r.sku, name: r.name, category: r.category, price: Number(r.price) || 0,
    stock: Number(r.stock) || 0, reorderAt: Number(r.reorderAt) || 0, imageKey: r.imageKey || null,
    accentColor: r.accentColor || null, description: r.description || null,
    isHot: r.isHot === true || r.isHot === "true", isVisible: !(r.isVisible === false || r.isVisible === "false"),
  };
}
function orderOut_(r, items) {
  return {
    id: r.id, code: r.code, studentEmail: r.studentEmail, total: Number(r.total) || 0,
    paymentStatus: r.paymentStatus, receiptKey: r.receiptKey || null, upiRef: r.upiRef || null,
    paidAt: r.paidAt || null, status: r.status, createdAt: r.createdAt,
    items: (items || []).map((i) => ({ productId: i.productId, name: i.name, qty: Number(i.qty) || 0, unitPrice: Number(i.unitPrice) || 0 })),
  };
}
function userNameMap_() {
  const m = {};
  table_("Users").items.forEach((u) => (m[String(u.email).toLowerCase()] = u.name));
  return m;
}
function notify_(userEmail, type, title, body, linkPath) {
  append_("Notifications", {
    id: uuid_(), userEmail: String(userEmail).toLowerCase(), type: type, title: title,
    body: body, linkPath: linkPath || "", read: false, createdAt: nowIso_(),
  });
  // best-effort email
  try {
    const s = settingsObj_();
    if (s.autoEmailWhenReady) MailApp.sendEmail(String(userEmail), "[Printly] " + title, body);
  } catch (e) { /* ignore mail quota errors */ }
}

// ================= HANDLERS =================
const HANDLERS = {
  // --- auth ---
  getUserByEmail: function (p) {
    const u = findRow_("Users", "email", String(p.email).toLowerCase());
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, phone: u.phone || null, passwordHash: u.passwordHash, role: u.role };
  },
  createUser: function (p) {
    const email = String(p.email).toLowerCase();
    if (findRow_("Users", "email", email)) throw new Error("exists");
    const id = uuid_();
    append_("Users", { id: id, name: p.name, email: email, phone: p.phone || "", passwordHash: p.passwordHash, role: p.role || "STUDENT", createdAt: nowIso_() });
    return { id: id, name: p.name, email: email, role: p.role || "STUDENT" };
  },

  // --- settings ---
  getSettings: function () { return settingsObj_(); },
  updateSettings: function (p) {
    Object.keys(p).forEach((k) => setSetting_(k, p[k]));
    return settingsObj_();
  },

  // --- products ---
  listProducts: function (p) {
    let items = table_("Products").items.map(productOut_);
    if (p && p.visibleOnly) items = items.filter((x) => x.isVisible);
    return items;
  },
  getProduct: function (p) {
    const r = findRow_("Products", "id", p.id);
    return r ? productOut_(r) : null;
  },
  createProduct: function (p) {
    const sku = "P-" + nextSeq_("sku", 8);
    const id = uuid_();
    append_("Products", {
      id: id, sku: sku, name: p.name, category: p.category, price: p.price, stock: p.stock,
      reorderAt: p.reorderAt, imageKey: p.imageKey || "", accentColor: p.accentColor || "",
      description: p.description || "", isHot: !!p.isHot, isVisible: p.isVisible !== false,
      createdAt: nowIso_(), updatedAt: nowIso_(),
    });
    return { id: id, sku: sku };
  },
  updateProduct: function (p) {
    const r = findRow_("Products", "id", p.id);
    if (!r) throw new Error("not found");
    const patch = { name: p.name, category: p.category, price: p.price, stock: p.stock, reorderAt: p.reorderAt, accentColor: p.accentColor || "", description: p.description || "", isHot: !!p.isHot, isVisible: p.isVisible !== false, updatedAt: nowIso_() };
    if (p.imageKey) patch.imageKey = p.imageKey;
    update_("Products", r._row, patch);
    return { ok: true };
  },
  listCategories: function () {
    const set = {};
    table_("Products").items.forEach((r) => { if (r.category) set[r.category] = true; });
    return Object.keys(set).sort();
  },

  // --- print jobs ---
  createPrintJob: function (p) {
    const code = "PR-" + nextSeq_("print", 240);
    const id = uuid_();
    append_("PrintJobs", {
      id: id, code: code, studentEmail: String(p.studentEmail).toLowerCase(), fileName: p.fileName,
      fileKey: p.fileKey, pageCount: p.pageCount, copies: p.copies, color: p.color, sided: p.sided,
      paperSize: p.paperSize, binding: p.binding, coverPage: !!p.coverPage, rush: !!p.rush, amount: p.amount,
      paymentStatus: "PENDING", receiptKey: "", upiRef: "", paidAt: "", status: "AWAITING_PAYMENT",
      createdAt: nowIso_(), updatedAt: nowIso_(),
    });
    return { id: id, code: code };
  },
  getPrintJob: function (p) {
    const r = findRow_("PrintJobs", "id", p.id);
    return r ? jobOut_(r) : null;
  },
  listPrintJobsByStudent: function (p) {
    const email = String(p.email).toLowerCase();
    return table_("PrintJobs").items.filter((r) => String(r.studentEmail).toLowerCase() === email).map(jobOut_).reverse();
  },
  submitPrintReceipt: function (p) {
    const r = findRow_("PrintJobs", "id", p.id);
    if (!r) throw new Error("not found");
    update_("PrintJobs", r._row, { paymentStatus: "SUBMITTED", upiRef: p.upiRef, receiptKey: p.receiptKey, updatedAt: nowIso_() });
    return { ok: true };
  },
  queueData: function () {
    const names = userNameMap_();
    const jobs = table_("PrintJobs").items;
    const withName = (r) => Object.assign(jobOut_(r), { studentName: names[String(r.studentEmail).toLowerCase()] || r.studentEmail });
    const toVerify = jobs.filter((r) => r.paymentStatus === "SUBMITTED").map(withName);
    const active = jobs.filter((r) => r.paymentStatus === "VERIFIED" && ["QUEUED", "PRINTING", "READY"].indexOf(r.status) >= 0).map(withName);
    const pickedUp = jobs.filter((r) => r.status === "PICKED_UP").map(withName).reverse().slice(0, 8);
    const today = startOfTodayIso_();
    let todayRevenue = 0;
    jobs.forEach((r) => { if (r.paymentStatus === "VERIFIED" && r.paidAt && r.paidAt >= today) todayRevenue += Number(r.amount) || 0; });
    return {
      toVerify, active, pickedUp,
      stats: {
        queued: active.filter((j) => j.status === "QUEUED").length,
        printing: active.filter((j) => j.status === "PRINTING").length,
        ready: active.filter((j) => j.status === "READY").length,
        todayRevenue,
      },
    };
  },
  verifyPrintPayment: function (p) {
    const r = findRow_("PrintJobs", "id", p.id);
    if (!r || r.paymentStatus !== "SUBMITTED") return { ok: true };
    update_("PrintJobs", r._row, { paymentStatus: "VERIFIED", status: "QUEUED", paidAt: nowIso_(), updatedAt: nowIso_() });
    notify_(r.studentEmail, "PAYMENT_VERIFIED", "Payment confirmed", "Your payment for " + r.code + " is confirmed — it's now in the print queue.", "/orders");
    return { ok: true };
  },
  rejectPrintPayment: function (p) {
    const r = findRow_("PrintJobs", "id", p.id);
    if (!r || r.paymentStatus !== "SUBMITTED") return { ok: true };
    update_("PrintJobs", r._row, { paymentStatus: "REJECTED", updatedAt: nowIso_() });
    notify_(r.studentEmail, "PAYMENT_REJECTED", "Payment couldn't be verified", "Please re-upload your receipt for " + r.code + ".", "/print/" + r.id + "/pay");
    return { ok: true };
  },
  advancePrintJob: function (p) {
    const r = findRow_("PrintJobs", "id", p.id);
    if (!r || r.paymentStatus !== "VERIFIED") return { ok: true };
    const NEXT = { QUEUED: "PRINTING", PRINTING: "READY", READY: "PICKED_UP" };
    if (NEXT[r.status] !== p.to) return { ok: true };
    update_("PrintJobs", r._row, { status: p.to, updatedAt: nowIso_() });
    if (p.to === "READY") notify_(r.studentEmail, "PRINT_READY", "Your print is ready", r.code + " is printed and ready for pickup.", "/orders");
    else if (p.to === "PICKED_UP") notify_(r.studentEmail, "PRINT_PICKED_UP", "Picked up", r.code + " was handed over. Thanks!", "/orders");
    return { ok: true };
  },

  // --- orders ---
  createOrder: function (p) {
    const products = table_("Products").items;
    const qtyById = {};
    (p.items || []).forEach((it) => { qtyById[it.productId] = (qtyById[it.productId] || 0) + (Number(it.qty) || 0); });
    const ids = Object.keys(qtyById);
    if (!ids.length) throw new Error("empty cart");
    let total = 0;
    const lines = [];
    ids.forEach((pid) => {
      const prod = products.find((x) => String(x.id) === String(pid));
      if (!prod || String(prod.isVisible) === "false") throw new Error("unavailable");
      const qty = qtyById[pid];
      if ((Number(prod.stock) || 0) < qty) throw new Error("Only " + prod.stock + ' left of "' + prod.name + '".');
      const unit = Number(prod.price) || 0;
      total += unit * qty;
      lines.push({ productId: prod.id, name: prod.name, qty: qty, unitPrice: unit });
    });
    const code = "SO-" + nextSeq_("order", 100);
    const id = uuid_();
    append_("Orders", { id: id, code: code, studentEmail: String(p.studentEmail).toLowerCase(), total: total, paymentStatus: "PENDING", receiptKey: "", upiRef: "", paidAt: "", status: "AWAITING_PAYMENT", createdAt: nowIso_(), updatedAt: nowIso_() });
    lines.forEach((l) => append_("OrderItems", { orderId: id, productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice }));
    return { id: id, code: code, total: total };
  },
  getOrder: function (p) {
    const r = findRow_("Orders", "id", p.id);
    if (!r) return null;
    const items = table_("OrderItems").items.filter((i) => String(i.orderId) === String(r.id));
    return orderOut_(r, items);
  },
  listOrdersByStudent: function (p) {
    const email = String(p.email).toLowerCase();
    const allItems = table_("OrderItems").items;
    return table_("Orders").items
      .filter((r) => String(r.studentEmail).toLowerCase() === email)
      .map((r) => orderOut_(r, allItems.filter((i) => String(i.orderId) === String(r.id))))
      .reverse();
  },
  submitOrderReceipt: function (p) {
    const r = findRow_("Orders", "id", p.id);
    if (!r) throw new Error("not found");
    update_("Orders", r._row, { paymentStatus: "SUBMITTED", upiRef: p.upiRef, receiptKey: p.receiptKey, updatedAt: nowIso_() });
    return { ok: true };
  },
  shopOrdersData: function () {
    const names = userNameMap_();
    const allItems = table_("OrderItems").items;
    const withItems = (r) => Object.assign(orderOut_(r, allItems.filter((i) => String(i.orderId) === String(r.id))), { studentName: names[String(r.studentEmail).toLowerCase()] || r.studentEmail });
    const orders = table_("Orders").items;
    const toVerify = orders.filter((r) => r.paymentStatus === "SUBMITTED").map(withItems);
    const ready = orders.filter((r) => r.status === "READY").map(withItems);
    const pickedUp = orders.filter((r) => r.status === "PICKED_UP").map(withItems).reverse().slice(0, 6);
    const today = startOfTodayIso_();
    let todayRevenue = 0;
    orders.forEach((r) => { if (r.paymentStatus === "VERIFIED" && r.paidAt && r.paidAt >= today) todayRevenue += Number(r.total) || 0; });
    return { toVerify, ready, pickedUp, stats: { pendingPickups: ready.length, pendingValue: ready.reduce((s, o) => s + o.total, 0), todayRevenue } };
  },
  verifyOrderPayment: function (p) {
    const lock = LockService.getScriptLock();
    lock.waitLock(8000);
    try {
      const r = findRow_("Orders", "id", p.id);
      if (!r || r.paymentStatus !== "SUBMITTED") return { ok: true };
      update_("Orders", r._row, { paymentStatus: "VERIFIED", status: "READY", paidAt: nowIso_(), updatedAt: nowIso_() });
      const items = table_("OrderItems").items.filter((i) => String(i.orderId) === String(r.id));
      const prods = table_("Products");
      const stockCol = prods.headers.indexOf("stock") + 1;
      items.forEach((it) => {
        const prod = prods.items.find((x) => String(x.id) === String(it.productId));
        if (prod) prods.sh.getRange(prod._row, stockCol).setValue((Number(prod.stock) || 0) - (Number(it.qty) || 0));
      });
      notify_(r.studentEmail, "ORDER_READY", "Order ready for pickup", "Your order " + r.code + " is confirmed and ready to collect.", "/orders");
      return { ok: true };
    } finally {
      lock.releaseLock();
    }
  },
  rejectOrderPayment: function (p) {
    const r = findRow_("Orders", "id", p.id);
    if (!r || r.paymentStatus !== "SUBMITTED") return { ok: true };
    update_("Orders", r._row, { paymentStatus: "REJECTED", updatedAt: nowIso_() });
    notify_(r.studentEmail, "PAYMENT_REJECTED", "Payment couldn't be verified", "Please re-upload your receipt for order " + r.code + ".", "/store/orders/" + r.id + "/pay");
    return { ok: true };
  },
  markOrderPickedUp: function (p) {
    const r = findRow_("Orders", "id", p.id);
    if (!r || r.status !== "READY") return { ok: true };
    update_("Orders", r._row, { status: "PICKED_UP", updatedAt: nowIso_() });
    return { ok: true };
  },

  // --- notifications ---
  listNotifications: function (p) {
    const email = String(p.email).toLowerCase();
    return table_("Notifications").items
      .filter((r) => String(r.userEmail).toLowerCase() === email)
      .map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, linkPath: r.linkPath || null, read: r.read === true || r.read === "true", createdAt: r.createdAt }))
      .reverse().slice(0, 50);
  },
  unreadCount: function (p) {
    const email = String(p.email).toLowerCase();
    return { count: table_("Notifications").items.filter((r) => String(r.userEmail).toLowerCase() === email && !(r.read === true || r.read === "true")).length };
  },
  markAllRead: function (p) {
    const email = String(p.email).toLowerCase();
    const { sh, headers, items } = table_("Notifications");
    const readCol = headers.indexOf("read") + 1;
    items.forEach((r) => { if (String(r.userEmail).toLowerCase() === email && !(r.read === true || r.read === "true")) sh.getRange(r._row, readCol).setValue(true); });
    return { ok: true };
  },
};

// ================= SETUP =================
function setup() {
  const ss = ss_();
  const defs = {
    Settings: ["Key", "Value"],
    Users: ["id", "name", "email", "phone", "passwordHash", "role", "createdAt"],
    Products: ["id", "sku", "name", "category", "price", "stock", "reorderAt", "imageKey", "accentColor", "description", "isHot", "isVisible", "createdAt", "updatedAt"],
    PrintJobs: ["id", "code", "studentEmail", "fileName", "fileKey", "pageCount", "copies", "color", "sided", "paperSize", "binding", "coverPage", "rush", "amount", "paymentStatus", "receiptKey", "upiRef", "paidAt", "status", "createdAt", "updatedAt"],
    Orders: ["id", "code", "studentEmail", "total", "paymentStatus", "receiptKey", "upiRef", "paidAt", "status", "createdAt", "updatedAt"],
    OrderItems: ["orderId", "productId", "name", "qty", "unitPrice"],
    Notifications: ["id", "userEmail", "type", "title", "body", "linkPath", "read", "createdAt"],
  };
  Object.keys(defs).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(defs[name]);
  });

  const seed = {
    bwPerPage: 200, colorPerPage: 1000, doubleSidedSurcharge: 0, a3Surcharge: 300,
    stapleFee: 500, spiralFee: 3000, coverPageFee: 1000, rushPercent: 20, freeSpiralAbove: 20000,
    acceptingJobs: true, allowCashOnCollection: true, autoEmailWhenReady: true,
    upiId: "printly@okaxis", shopName: "Printly", shopLocation: "Block B",
  };
  Object.keys(seed).forEach((k) => { if (findRow_("Settings", "Key", k) === null) setSetting_(k, seed[k]); });

  if (table_("Users").items.length === 0) {
    append_("Users", { id: uuid_(), name: "Ramesh Patel", email: "shop@printly.college", phone: "", passwordHash: "$2b$10$xYhppHXluq5lULGKQrUj1OQNLDmb9EkQj4Qg2Jkm2zIRCwjmzADGS", role: "SHOPKEEPER", createdAt: nowIso_() });
    append_("Users", { id: uuid_(), name: "Aanya M.", email: "student@printly.college", phone: "9876543210", passwordHash: "$2b$10$x100p64J5MrkX5pzDoO98.UBv2SBhh6ChLsG6cum67SJBsfgwbyY.", role: "STUDENT", createdAt: nowIso_() });
  }
  if (table_("Products").items.length === 0) {
    [
      ["P-01", "Classmate Notebook · 200 pgs", "Notebooks", 9500, 42, 10, false],
      ["P-02", "Reynolds 045 Pen · pack of 5", "Pens", 5000, 120, 20, false],
      ["P-03", "Casio fx-991EX Calculator", "Calculators", 145000, 6, 8, true],
      ["P-04", "Graph sheets · A4 · 100", "Sheets", 8000, 28, 10, false],
      ["P-05", "Lab record file · ruled", "Files", 11000, 14, 10, false],
      ["P-06", "Highlighter pack · 4 colors", "Pens", 12000, 9, 12, false],
      ["P-07", "Apsara Platinum Pencil · pack of 10", "Pens", 8000, 60, 15, true],
      ["P-08", "Geometry box · Camlin", "Geometry", 18000, 22, 8, false],
    ].forEach((r) => append_("Products", { id: uuid_(), sku: r[0], name: r[1], category: r[2], price: r[3], stock: r[4], reorderAt: r[5], imageKey: "", accentColor: "#ffe2d2", description: "", isHot: r[6], isVisible: true, createdAt: nowIso_(), updatedAt: nowIso_() }));
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("SEQ_print")) props.setProperty("SEQ_print", "240");
  if (!props.getProperty("SEQ_order")) props.setProperty("SEQ_order", "100");
  if (!props.getProperty("SEQ_sku")) props.setProperty("SEQ_sku", "8");

  return "Setup complete. Tabs + seed ready. Set API_SECRET in Script Properties, then deploy as a Web app.";
}

// Domain types for the Sheets-backed data layer (replaces @prisma/client types).

export type Role = "STUDENT" | "SHOPKEEPER";
export type ColorMode = "BW" | "COLOR";
export type Sided = "SINGLE" | "DOUBLE";
export type PaperSize = "A4" | "A3";
export type Binding = "NONE" | "STAPLE" | "SPIRAL";
export type PaymentStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
export type PrintStatus =
  | "AWAITING_PAYMENT"
  | "QUEUED"
  | "PRINTING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";
export type OrderStatus = "AWAITING_PAYMENT" | "PENDING" | "READY" | "PICKED_UP" | "CANCELLED";
export type NotificationType =
  | "PAYMENT_VERIFIED"
  | "PAYMENT_REJECTED"
  | "PRINT_READY"
  | "ORDER_READY"
  | "PRINT_PICKED_UP";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: Role;
};

export type PrintJob = {
  id: string;
  code: string;
  studentEmail: string;
  fileName: string;
  fileKey: string;
  pageCount: number;
  copies: number;
  color: ColorMode;
  sided: Sided;
  paperSize: PaperSize;
  binding: Binding;
  coverPage: boolean;
  rush: boolean;
  amount: number; // paise
  paymentStatus: PaymentStatus;
  receiptKey: string | null;
  upiRef: string | null;
  paidAt: Date | null;
  status: PrintStatus;
  createdAt: Date;
  updatedAt: Date | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number; // paise
  stock: number;
  reorderAt: number;
  imageKey: string | null;
  accentColor: string | null;
  description: string | null;
  isHot: boolean;
  isVisible: boolean;
};

export type OrderItem = { productId: string; name: string; qty: number; unitPrice: number };

export type ShopOrder = {
  id: string;
  code: string;
  studentEmail: string;
  total: number; // paise
  paymentStatus: PaymentStatus;
  receiptKey: string | null;
  upiRef: string | null;
  paidAt: Date | null;
  status: OrderStatus;
  createdAt: Date;
  items: OrderItem[];
};

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath: string | null;
  read: boolean;
  createdAt: Date;
};

export type Settings = {
  bwPerPage: number;
  colorPerPage: number;
  doubleSidedSurcharge: number;
  a3Surcharge: number;
  stapleFee: number;
  spiralFee: number;
  coverPageFee: number;
  rushPercent: number;
  freeSpiralAbove: number;
  acceptingJobs: boolean;
  allowCashOnCollection: boolean;
  autoEmailWhenReady: boolean;
  upiId: string | null;
  shopName: string;
  shopLocation: string;
};

// Rows enriched with the student's name (shopkeeper views).
export type WithStudent<T> = T & { studentName: string };

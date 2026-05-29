-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'SHOPKEEPER');

-- CreateEnum
CREATE TYPE "ColorMode" AS ENUM ('BW', 'COLOR');

-- CreateEnum
CREATE TYPE "Sided" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A4', 'A3');

-- CreateEnum
CREATE TYPE "Binding" AS ENUM ('NONE', 'STAPLE', 'SPIRAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PrintStatus" AS ENUM ('AWAITING_PAYMENT', 'QUEUED', 'PRINTING', 'READY', 'PICKED_UP', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('AWAITING_PAYMENT', 'PENDING', 'READY', 'PICKED_UP', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PRINT_READY', 'ORDER_READY', 'PRINT_PICKED_UP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bwPerPage" INTEGER NOT NULL DEFAULT 200,
    "colorPerPage" INTEGER NOT NULL DEFAULT 1000,
    "doubleSidedSurcharge" INTEGER NOT NULL DEFAULT 0,
    "a3Surcharge" INTEGER NOT NULL DEFAULT 300,
    "stapleFee" INTEGER NOT NULL DEFAULT 500,
    "spiralFee" INTEGER NOT NULL DEFAULT 3000,
    "coverPageFee" INTEGER NOT NULL DEFAULT 1000,
    "rushPercent" INTEGER NOT NULL DEFAULT 20,
    "freeSpiralAbove" INTEGER NOT NULL DEFAULT 0,
    "acceptingJobs" BOOLEAN NOT NULL DEFAULT true,
    "allowCashOnCollection" BOOLEAN NOT NULL DEFAULT true,
    "autoEmailWhenReady" BOOLEAN NOT NULL DEFAULT true,
    "upiId" TEXT,
    "upiQrPath" TEXT,
    "shopName" TEXT NOT NULL DEFAULT 'Printly',
    "shopLocation" TEXT NOT NULL DEFAULT 'Campus',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "color" "ColorMode" NOT NULL DEFAULT 'BW',
    "sided" "Sided" NOT NULL DEFAULT 'SINGLE',
    "paperSize" "PaperSize" NOT NULL DEFAULT 'A4',
    "binding" "Binding" NOT NULL DEFAULT 'NONE',
    "coverPage" BOOLEAN NOT NULL DEFAULT false,
    "rush" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptPath" TEXT,
    "upiRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "status" "PrintStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorderAt" INTEGER NOT NULL DEFAULT 0,
    "imagePath" TEXT,
    "accentColor" TEXT,
    "description" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptPath" TEXT,
    "upiRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkPath" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PrintJob_code_key" ON "PrintJob"("code");

-- CreateIndex
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");

-- CreateIndex
CREATE INDEX "PrintJob_studentId_idx" ON "PrintJob"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_code_key" ON "ShopOrder"("code");

-- CreateIndex
CREATE INDEX "ShopOrder_status_idx" ON "ShopOrder"("status");

-- CreateIndex
CREATE INDEX "ShopOrder_studentId_idx" ON "ShopOrder"("studentId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

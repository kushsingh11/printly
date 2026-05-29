import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ??
  process.env.NETLIFY_DATABASE_URL ??
  process.env.DATABASE_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString!) });

async function main() {
  // --- Pricing settings (singleton, id = 1) ---
  await prisma.pricingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bwPerPage: 200, // ₹2.00 / page
      colorPerPage: 1000, // ₹10.00 / page
      doubleSidedSurcharge: 0,
      a3Surcharge: 300, // ₹3.00 / page
      stapleFee: 500, // ₹5
      spiralFee: 3000, // ₹30
      coverPageFee: 1000, // ₹10
      rushPercent: 20,
      freeSpiralAbove: 20000, // ₹200
      acceptingJobs: true,
      allowCashOnCollection: true,
      autoEmailWhenReady: true,
      upiId: "printly@okaxis",
      shopName: "Printly",
      shopLocation: "Block B",
    },
  });

  // --- Users ---
  const shopPass = await bcrypt.hash("printly123", 10);
  const studentPass = await bcrypt.hash("student123", 10);

  await prisma.user.upsert({
    where: { email: "shop@printly.college" },
    update: {},
    create: {
      name: "Ramesh Patel",
      email: "shop@printly.college",
      passwordHash: shopPass,
      role: "SHOPKEEPER",
    },
  });

  await prisma.user.upsert({
    where: { email: "student@printly.college" },
    update: {},
    create: {
      name: "Aanya M.",
      email: "student@printly.college",
      phone: "9876543210",
      passwordHash: studentPass,
      role: "STUDENT",
    },
  });

  // --- Categories ---
  const categoryNames = ["Notebooks", "Pens", "Calculators", "Files", "Sheets", "Geometry"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = c.id;
  }

  // --- Products (8 SKUs; 2 below reorder level => low-stock alerts) ---
  const products = [
    { sku: "P-01", name: "Classmate Notebook · 200 pgs", cat: "Notebooks", price: 9500, stock: 42, reorderAt: 10 },
    { sku: "P-02", name: "Reynolds 045 Pen · pack of 5", cat: "Pens", price: 5000, stock: 120, reorderAt: 20 },
    { sku: "P-03", name: "Casio fx-991EX Calculator", cat: "Calculators", price: 145000, stock: 6, reorderAt: 8, hot: true },
    { sku: "P-04", name: "Graph sheets · A4 · 100", cat: "Sheets", price: 8000, stock: 28, reorderAt: 10 },
    { sku: "P-05", name: "Lab record file · ruled", cat: "Files", price: 11000, stock: 14, reorderAt: 10 },
    { sku: "P-06", name: "Highlighter pack · 4 colors", cat: "Pens", price: 12000, stock: 9, reorderAt: 12 },
    {
      sku: "P-07",
      name: "Apsara Platinum Pencil · pack of 10",
      cat: "Pens",
      price: 8000,
      stock: 60,
      reorderAt: 15,
      hot: true,
      desc: "Smooth-write graphite. Pre-sharpened. Great for exam halls.",
    },
    { sku: "P-08", name: "Geometry box · Camlin", cat: "Geometry", price: 18000, stock: 22, reorderAt: 8 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: categories[p.cat],
        price: p.price,
        stock: p.stock,
        reorderAt: p.reorderAt,
        isHot: p.hot ?? false,
        description: p.desc ?? null,
      },
    });
  }

  // --- Counters for human-friendly codes ---
  await prisma.counter.upsert({ where: { name: "print" }, update: {}, create: { name: "print", value: 240 } });
  await prisma.counter.upsert({ where: { name: "order" }, update: {}, create: { name: "order", value: 100 } });

  console.log("Seed complete.");
  console.log("  Shopkeeper: shop@printly.college / printly123");
  console.log("  Student:    student@printly.college / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

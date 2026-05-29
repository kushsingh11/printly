import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. Reuse a single client across hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  // Runtime uses the pooled connection (better for serverless); falls back to
  // the local DATABASE_URL for `next dev`.
  const connectionString = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
  const adapter = new PrismaPg(connectionString!);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

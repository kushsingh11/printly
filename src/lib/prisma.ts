import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getConnectionString } from "@netlify/database";

// Prisma 7 requires a driver adapter. Reuse a single client across hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function connectionString(): string {
  // On Netlify, the managed Postgres connection comes from getConnectionString()
  // (it is NOT exposed as a plain env var). Locally, fall back to DATABASE_URL.
  try {
    const s = getConnectionString();
    if (s) return s;
  } catch {
    /* not running on Netlify */
  }
  return (process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL)!;
}

function createClient() {
  const adapter = new PrismaPg(connectionString());
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

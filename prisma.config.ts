import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Used by the Prisma CLI for migrate/introspect. Migrations need a DIRECT
    // (unpooled) connection; falls back to the local DATABASE_URL for dev.
    url:
      process.env.NETLIFY_DATABASE_URL_UNPOOLED ??
      process.env.NETLIFY_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "",
  },
  migrations: {
    // `npx prisma db seed` runs this.
    seed: "npx tsx prisma/seed.ts",
  },
});

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL preferred for migrations; fall back to DATABASE_URL so
    // `prisma generate` succeeds in CI environments where secrets aren't set.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://placeholder@localhost/placeholder",
  },
});

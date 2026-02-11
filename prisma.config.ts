import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl = env('DATABASE_URL');
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl
  },
});

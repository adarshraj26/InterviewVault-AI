import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getPool() {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }
  const connectionString = process.env.DATABASE_URL || "";
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 10 : 3, // Prevent dev pool overflow
    idleTimeoutMillis: 10000, // Disconnect idle clients after 10s
    connectionTimeoutMillis: 5000,
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
  return pool;
}

function createPrismaClient() {
  const pool = getPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}


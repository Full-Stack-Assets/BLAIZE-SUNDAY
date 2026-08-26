import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
    });
  } catch {
    console.warn("[AI Studio] Database not connected — using mock");
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
      count: async () => 0,
      aggregate: async () => ({}),
      groupBy: async () => [],
      upsert: async (d: any) => d?.create ?? d?.update ?? {}
    };
    return new Proxy({} as any, {
      get: (_, prop) => {
        if (prop === "$connect" || prop === "$disconnect") return async () => {};
        if (prop === "$transaction") return async (fnOrArr: any) => (typeof fnOrArr === "function" ? fnOrArr(prisma) : fnOrArr);
        if (prop === "$queryRaw" || prop === "$executeRaw") return async () => [];
        return new Proxy(noOp, { get: (target, p) => (target as any)[p] || (async () => null) });
      }
    });
  }
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

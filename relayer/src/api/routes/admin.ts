import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { pools, tokens } from "../../db/schema.js";
import { adminAuth } from "../middleware/admin-auth.js";
import { startPoolIndexer, stopPoolIndexer } from "../../indexer/index.js";

const registerPoolSchema = z.object({
  poolId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  fee: z.number().int(),
  tickSpacing: z.number().int(),
  hookAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  initBlock: z.number().int().optional(),
  token0: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number().int().default(18),
    imageUrl: z.string().optional(),
  }),
  token1: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number().int().default(18),
    imageUrl: z.string().optional(),
  }),
});

const updatePoolSchema = z.object({
  isActive: z.boolean().optional(),
  hookAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export async function adminRoutes(server: FastifyInstance) {
  server.addHook("onRequest", adminAuth);

  server.post("/api/admin/pools", {
    schema: {
      tags: ["Admin"],
      summary: "Register a new pool",
      body: {
        type: "object",
        required: ["poolId", "fee", "tickSpacing", "hookAddress", "token0", "token1"],
        properties: {
          poolId: { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" },
          fee: { type: "integer" },
          tickSpacing: { type: "integer" },
          hookAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          initBlock: { type: "integer" },
          token0: {
            type: "object",
            required: ["address", "name", "symbol"],
            properties: {
              address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
              name: { type: "string" },
              symbol: { type: "string" },
              decimals: { type: "integer", default: 18 },
              imageUrl: { type: "string" },
            },
          },
          token1: {
            type: "object",
            required: ["address", "name", "symbol"],
            properties: {
              address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
              name: { type: "string" },
              symbol: { type: "string" },
              decimals: { type: "integer", default: 18 },
              imageUrl: { type: "string" },
            },
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: { success: { type: "boolean" }, poolId: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const body = registerPoolSchema.parse(request.body);
    const db = getDb();

    // Upsert tokens
    for (const tokenData of [body.token0, body.token1]) {
      await db
        .insert(tokens)
        .values({
          address: tokenData.address,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals,
          imageUrl: tokenData.imageUrl,
        })
        .onConflictDoUpdate({
          target: tokens.address,
          set: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            decimals: tokenData.decimals,
            imageUrl: tokenData.imageUrl,
          },
        });
    }

    // Insert pool
    await db
      .insert(pools)
      .values({
        poolId: body.poolId,
        token0Address: body.token0.address,
        token1Address: body.token1.address,
        fee: body.fee,
        tickSpacing: body.tickSpacing,
        hookAddress: body.hookAddress,
        initBlock: body.initBlock,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: pools.poolId,
        set: {
          token0Address: body.token0.address,
          token1Address: body.token1.address,
          fee: body.fee,
          tickSpacing: body.tickSpacing,
          hookAddress: body.hookAddress,
          initBlock: body.initBlock,
        },
      });

    // Start indexer for the new pool
    await startPoolIndexer(body.poolId);

    reply.code(201).send({ success: true, poolId: body.poolId });
  });

  server.put("/api/admin/pools/:poolId", {
    schema: {
      tags: ["Admin"],
      summary: "Update a pool",
      params: {
        type: "object",
        properties: { poolId: { type: "string", description: "Pool identifier (bytes32 hex)" } },
        required: ["poolId"],
      },
      body: {
        type: "object",
        properties: {
          isActive: { type: "boolean" },
          hookAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { success: { type: "boolean" } },
        },
        404: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const { poolId } = request.params as { poolId: string };
    const body = updatePoolSchema.parse(request.body);
    const db = getDb();

    const existing = await db
      .select()
      .from(pools)
      .where(eq(pools.poolId, poolId))
      .limit(1);

    if (existing.length === 0) {
      return reply.code(404).send({ error: "Pool not found" });
    }

    const updates: Record<string, any> = {};
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.hookAddress) updates.hookAddress = body.hookAddress;

    if (Object.keys(updates).length > 0) {
      await db.update(pools).set(updates).where(eq(pools.poolId, poolId));
    }

    // Start/stop indexer based on active state
    if (body.isActive === false) {
      stopPoolIndexer(poolId);
    } else if (body.isActive === true) {
      await startPoolIndexer(poolId);
    }

    reply.send({ success: true });
  });
}

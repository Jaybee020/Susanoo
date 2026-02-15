import type { FastifyRequest } from "fastify";

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function parsePagination(request: FastifyRequest): PaginationParams {
  const query = request.query as Record<string, string>;
  const limit = Math.min(Math.max(parseInt(query.limit || "50", 10), 1), 500);
  const offset = Math.max(parseInt(query.offset || "0", 10), 0);
  return { limit, offset };
}

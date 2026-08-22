import { z } from "zod";

export const eventSchema = z.object({
  id: z.string().min(1).optional(),
  projectId: z.string().min(1),
  source: z.string().min(1),
  type: z.string().min(1),
  occurredAt: z.iso.datetime().optional(),
  actor: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const chatSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1).max(12_000),
  provider: z.string().optional(),
  model: z.string().optional(),
});

export const connectorSyncSchema = z.object({
  projectId: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

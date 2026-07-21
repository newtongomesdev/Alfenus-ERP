import { NextResponse } from "next/server";
import { z } from "zod";

import { recordErrorEvent } from "@/lib/observability/error-events";

const payloadSchema = z.object({
  source: z.literal("client"),
  message: z.string().min(1).max(2000),
  path: z.string().max(500).default("/"),
  method: z.string().max(16).optional(),
  userAgent: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    await recordErrorEvent(payload);
  } catch {
    // Do not turn a telemetry failure into another user-facing error.
  }

  return new NextResponse(null, { status: 204 });
}

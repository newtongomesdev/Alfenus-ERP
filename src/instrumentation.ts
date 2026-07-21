import type { Instrumentation } from "next";

import { recordErrorEvent } from "@/lib/observability/error-events";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const errorWithDigest = error as { digest?: unknown };
  const message = error instanceof Error ? error.message : String(error);
  const userAgent = request.headers["user-agent"];

  await recordErrorEvent({
    source: "server",
    message,
    digest: errorWithDigest.digest ? String(errorWithDigest.digest) : null,
    path: request.path.split("?")[0],
    method: request.method,
    routePath: context.routePath,
    routerKind: context.routerKind,
    routeType: context.routeType,
    userAgent: Array.isArray(userAgent) ? userAgent[0] ?? null : userAgent ?? null,
    metadata: {
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason ?? null,
    },
  });
};

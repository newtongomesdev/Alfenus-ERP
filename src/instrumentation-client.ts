function sendClientError(error: unknown, path = window.location.pathname) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = JSON.stringify({
    source: "client",
    message: message.slice(0, 2000),
    path: path.split("?")[0].slice(0, 500),
    method: "CLIENT",
    userAgent: navigator.userAgent.slice(0, 500),
    metadata: { online: navigator.onLine },
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry/errors", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/telemetry/errors", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    }
  } catch {
    // Observability must never interrupt the application.
  }
}

window.addEventListener("error", (event) => {
  if (event.error) sendClientError(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  sendClientError(event.reason);
});

function safePath(value: string) {
  try {
    return new URL(value, window.location.origin).pathname || "/";
  } catch {
    return value.split("?")[0].slice(0, 500) || "/";
  }
}

function sendClientError(error: unknown, path = window.location.pathname, metadata: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = JSON.stringify({
    source: "client",
    message: message.slice(0, 2000),
    path: safePath(path),
    method: "CLIENT",
    userAgent: navigator.userAgent.slice(0, 500),
    metadata: { online: navigator.onLine, ...metadata },
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

// O Next pode tratar internamente falhas de RSC/fetch sem disparar eventos
// globais. Registrar a resposta aqui preserva a rota real que falhou.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
  const requestPath = safePath(requestUrl);
  const requestMethod = init?.method ?? (typeof input === "string" || input instanceof URL ? "GET" : input.method);

  try {
    const response = await nativeFetch(input, init);
    if (!response.ok && requestPath !== "/api/telemetry/errors") {
      sendClientError(new Error(`Fetch HTTP ${response.status} em ${requestPath}`), requestPath, {
        status: response.status,
        method: requestMethod,
        kind: "fetch-response",
      });
    }
    return response;
  } catch (error) {
    if (requestPath !== "/api/telemetry/errors") {
      sendClientError(error, requestPath, { method: requestMethod, kind: "fetch-network" });
    }
    throw error;
  }
};

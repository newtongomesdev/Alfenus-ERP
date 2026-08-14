import { describe, expect, it } from "vitest";
import { assertDeliveryTransition, isTerminalDeliveryStatus, transitionForProviderEvent } from "./state";

describe("signature delivery state machine", () => {
  it("allows forward provider transitions and blocks regressions", () => {
    expect(transitionForProviderEvent("sent", { provider: "internal_sandbox", eventType: "viewed", providerEventId: "e", providerEnvelopeId: "p", payloadHash: "h", signerEmails: [] })).toBe("viewed");
    expect(() => assertDeliveryTransition("signed", "sent")).toThrow("SIGNATURE_DELIVERY_TRANSITION_INVALID");
    expect(isTerminalDeliveryStatus("signed")).toBe(true);
  });

  it("allows retry only from failed", () => {
    expect(() => assertDeliveryTransition("failed", "sending")).not.toThrow();
    expect(() => assertDeliveryTransition("cancelled", "sending")).toThrow("SIGNATURE_DELIVERY_TRANSITION_INVALID");
  });
});

import { describe, expect, it } from "vitest";
import { assertProposalTransition, canTransitionProposalStatus, getAllowedProposalTransitions, isProposalEditable, isProposalTerminal } from "./status";
describe("proposal state machine", () => {
  it("accepts declared transitions and rejects undeclared transitions", () => {
    expect(canTransitionProposalStatus("draft", "ready")).toBe(true); expect(canTransitionProposalStatus("sent", "accepted")).toBe(true); expect(canTransitionProposalStatus("accepted", "draft")).toBe(false); expect(() => assertProposalTransition("draft", "accepted")).toThrow("Transicao");
  });
  it("exposes editability, terminal states and restoration policy", () => { expect(isProposalEditable("draft")).toBe(true); expect(isProposalEditable("sent")).toBe(false); expect(isProposalTerminal("archived")).toBe(true); expect(getAllowedProposalTransitions("archived")).toEqual(["draft"]); });
  it.each([
    ["draft", "ready"], ["draft", "cancelled"], ["draft", "archived"], ["ready", "draft"], ["ready", "sent"], ["ready", "cancelled"], ["ready", "archived"],
    ["sent", "viewed"], ["sent", "accepted"], ["sent", "rejected"], ["sent", "expired"], ["sent", "cancelled"], ["sent", "superseded"],
    ["viewed", "accepted"], ["viewed", "rejected"], ["viewed", "expired"], ["viewed", "cancelled"], ["viewed", "superseded"],
    ["accepted", "archived"], ["rejected", "archived"], ["expired", "archived"], ["cancelled", "archived"], ["superseded", "archived"], ["archived", "draft"],
  ] as const)("allows %s -> %s", (from, to) => expect(canTransitionProposalStatus(from, to)).toBe(true));
  it.each([["draft", "sent"], ["ready", "accepted"], ["sent", "draft"], ["viewed", "ready"], ["accepted", "cancelled"], ["archived", "sent"]] as const)("blocks %s -> %s", (from, to) => expect(canTransitionProposalStatus(from, to)).toBe(false));
});

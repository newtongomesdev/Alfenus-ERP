import { SignatureEnvelopeError } from "../errors";
import type { DeliveryStatus, NormalizedSignatureEvent, ProviderEventType } from "./types";

const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["sending"], sending: ["sent", "failed", "cancelled"], sent: ["viewed", "partially_signed", "signed", "refused", "expired", "cancelled"], viewed: ["partially_signed", "signed", "refused", "expired", "cancelled"], partially_signed: ["signed", "refused", "expired", "cancelled"], signed: [], refused: [], expired: [], cancelled: [], failed: ["sending"],
};
const eventStatus: Record<ProviderEventType, DeliveryStatus> = { sent: "sent", viewed: "viewed", partially_signed: "partially_signed", signed: "signed", refused: "refused", expired: "expired", cancelled: "cancelled" };
export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus) { if (from === to) return; if (!transitions[from]?.includes(to)) throw new SignatureEnvelopeError("SIGNATURE_DELIVERY_TRANSITION_INVALID"); }
export function statusForProviderEvent(eventType: ProviderEventType) { return eventStatus[eventType]; }
export function isTerminalDeliveryStatus(status: DeliveryStatus) { return ["signed", "refused", "expired", "cancelled"].includes(status); }
export function transitionForProviderEvent(current: DeliveryStatus, event: NormalizedSignatureEvent) { const next = statusForProviderEvent(event.eventType); assertDeliveryTransition(current, next); return next; }

import { describe, expect, it } from "vitest";

/**
 * Unit tests for notification business logic.
 *
 * Mirrors the logic in notifications/queries.ts: preference checking,
 * notification filtering, archive logic, and alert deduplication.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface NotificationPreference {
  id: string;
  lawFirmId: string;
  memberId: string;
  notificationType: string;
  enabled: boolean;
}

interface Notification {
  id: string;
  lawFirmId: string;
  memberId: string | null;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  archivedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AlertMetadata {
  installmentId?: string;
  taskId?: string;
  deadlineId?: string;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring notification logic
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPES = [
  "deadline_reminder",
  "deadline_overdue",
  "task_assigned",
  "task_overdue",
  "payment_received",
  "payment_overdue",
  "document_received",
  "mention",
  "workflow_update",
  "client_portal_access",
] as const;

function shouldCreateNotification(
  preferences: NotificationPreference[],
  memberId: string,
  type: string,
): boolean {
  const pref = preferences.find(
    (p) => p.memberId === memberId && p.notificationType === type,
  );
  // If no preference exists, default to enabled
  if (!pref) return true;
  return pref.enabled;
}

function filterUnread(notifications: Notification[]): Notification[] {
  return notifications.filter((n) => n.readAt === null);
}

function filterByType(notifications: Notification[], type: string): Notification[] {
  return notifications.filter((n) => n.type === type);
}

function filterArchived(notifications: Notification[]): Notification[] {
  return notifications.filter((n) => n.archivedAt !== null);
}

function filterActive(notifications: Notification[]): Notification[] {
  return notifications.filter((n) => n.archivedAt === null);
}

function isDuplicateAlert(
  existingNotifications: Notification[],
  metadata: AlertMetadata,
  type: string,
): boolean {
  return existingNotifications.some((n) => {
    if (n.type !== type) return false;
    const nMeta = n.metadata as AlertMetadata;
    if (metadata.installmentId && nMeta.installmentId === metadata.installmentId) return true;
    if (metadata.taskId && nMeta.taskId === metadata.taskId) return true;
    if (metadata.deadlineId && nMeta.deadlineId === metadata.deadlineId) return true;
    return false;
  });
}

function paginateNotifications(
  notifications: Notification[],
  page: number,
  limit: number,
): { items: Notification[]; totalCount: number; totalPages: number } {
  const totalCount = notifications.length;
  const totalPages = Math.ceil(totalCount / limit);
  const from = (page - 1) * limit;
  const items = notifications.slice(from, from + limit);
  return { items, totalCount, totalPages };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Notifications – preference checking", () => {
  it("creates notification when no preference exists (default enabled)", () => {
    expect(shouldCreateNotification([], "member-1", "payment_overdue")).toBe(true);
  });

  it("creates notification when preference is enabled", () => {
    const prefs: NotificationPreference[] = [
      { id: "1", lawFirmId: "firm-1", memberId: "member-1", notificationType: "payment_overdue", enabled: true },
    ];
    expect(shouldCreateNotification(prefs, "member-1", "payment_overdue")).toBe(true);
  });

  it("does not create notification when preference is disabled", () => {
    const prefs: NotificationPreference[] = [
      { id: "1", lawFirmId: "firm-1", memberId: "member-1", notificationType: "payment_overdue", enabled: false },
    ];
    expect(shouldCreateNotification(prefs, "member-1", "payment_overdue")).toBe(false);
  });

  it("checks preference by both memberId and type", () => {
    const prefs: NotificationPreference[] = [
      { id: "1", lawFirmId: "firm-1", memberId: "member-1", notificationType: "payment_overdue", enabled: false },
      { id: "2", lawFirmId: "firm-1", memberId: "member-1", notificationType: "task_assigned", enabled: true },
    ];
    expect(shouldCreateNotification(prefs, "member-1", "payment_overdue")).toBe(false);
    expect(shouldCreateNotification(prefs, "member-1", "task_assigned")).toBe(true);
  });

  it("does not apply other member's preference", () => {
    const prefs: NotificationPreference[] = [
      { id: "1", lawFirmId: "firm-1", memberId: "member-2", notificationType: "payment_overdue", enabled: false },
    ];
    expect(shouldCreateNotification(prefs, "member-1", "payment_overdue")).toBe(true);
  });

  it("all notification types are covered", () => {
    expect(NOTIFICATION_TYPES).toHaveLength(10);
    for (const type of NOTIFICATION_TYPES) {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    }
  });
});

describe("Notifications – filtering", () => {
  const notifications: Notification[] = [
    { id: "1", lawFirmId: "firm-1", memberId: "m1", type: "payment_overdue", title: "A", body: null, readAt: null, archivedAt: null, metadata: {}, createdAt: "2025-06-15" },
    { id: "2", lawFirmId: "firm-1", memberId: "m1", type: "task_assigned", title: "B", body: null, readAt: "2025-06-14", archivedAt: null, metadata: {}, createdAt: "2025-06-14" },
    { id: "3", lawFirmId: "firm-1", memberId: "m1", type: "payment_overdue", title: "C", body: null, readAt: null, archivedAt: "2025-06-13", metadata: {}, createdAt: "2025-06-13" },
    { id: "4", lawFirmId: "firm-1", memberId: "m1", type: "mention", title: "D", body: null, readAt: null, archivedAt: null, metadata: {}, createdAt: "2025-06-15" },
  ];

  it("filters unread notifications", () => {
    const unread = filterUnread(notifications);
    expect(unread).toHaveLength(3); // ids 1, 3, 4
    expect(unread.every((n) => n.readAt === null)).toBe(true);
  });

  it("filters by type", () => {
    const payments = filterByType(notifications, "payment_overdue");
    expect(payments).toHaveLength(2);
  });

  it("filters archived notifications", () => {
    const archived = filterArchived(notifications);
    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe("3");
  });

  it("filters active (non-archived) notifications", () => {
    const active = filterActive(notifications);
    expect(active).toHaveLength(3);
    expect(active.every((n) => n.archivedAt === null)).toBe(true);
  });

  it("combined filter: unread + non-archived", () => {
    const active = filterActive(notifications);
    const unreadActive = filterUnread(active);
    expect(unreadActive).toHaveLength(2); // ids 1, 4
  });
});

describe("Notifications – alert deduplication", () => {
  const existing: Notification[] = [
    { id: "1", lawFirmId: "firm-1", memberId: "m1", type: "pagamento_atrasado", title: "A", body: null, readAt: null, archivedAt: null, metadata: { installmentId: "inst-1" }, createdAt: "2025-06-15" },
    { id: "2", lawFirmId: "firm-1", memberId: "m1", type: "tarefa_atrasada", title: "B", body: null, readAt: null, archivedAt: null, metadata: { taskId: "task-1" }, createdAt: "2025-06-15" },
  ];

  it("detects duplicate payment alert by installmentId", () => {
    expect(isDuplicateAlert(existing, { installmentId: "inst-1" }, "pagamento_atrasado")).toBe(true);
  });

  it("does not flag different installment as duplicate", () => {
    expect(isDuplicateAlert(existing, { installmentId: "inst-999" }, "pagamento_atrasado")).toBe(false);
  });

  it("detects duplicate task alert by taskId", () => {
    expect(isDuplicateAlert(existing, { taskId: "task-1" }, "tarefa_atrasada")).toBe(true);
  });

  it("does not flag different type as duplicate", () => {
    expect(isDuplicateAlert(existing, { installmentId: "inst-1" }, "prazo_proximo")).toBe(false);
  });

  it("handles empty existing notifications", () => {
    expect(isDuplicateAlert([], { installmentId: "inst-1" }, "pagamento_atrasado")).toBe(false);
  });
});

describe("Notifications – pagination", () => {
  const notifications: Notification[] = Array.from({ length: 25 }, (_, i) => ({
    id: `n-${i}`,
    lawFirmId: "firm-1",
    memberId: "m1",
    type: "payment_overdue",
    title: `Notificação ${i}`,
    body: null,
    readAt: null,
    archivedAt: null,
    metadata: {},
    createdAt: `2025-06-${String(i + 1).padStart(2, "0")}`,
  }));

  it("returns correct page size", () => {
    const result = paginateNotifications(notifications, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.totalCount).toBe(25);
  });

  it("returns correct total pages", () => {
    const result = paginateNotifications(notifications, 1, 10);
    expect(result.totalPages).toBe(3);
  });

  it("returns remaining items on last page", () => {
    const result = paginateNotifications(notifications, 3, 10);
    expect(result.items).toHaveLength(5);
  });

  it("returns empty for out-of-range page", () => {
    const result = paginateNotifications(notifications, 10, 10);
    expect(result.items).toHaveLength(0);
  });
});

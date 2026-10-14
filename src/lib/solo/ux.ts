import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

export function isNavigationItemActive(pathname: string, href: string, children: Array<{ href: string }> = []) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
}

export type SoloOverviewStatus = "ready" | "unavailable" | "error";

export function getSoloOverviewStatus(hasSession: boolean, queryErrors: number) {
  if (!hasSession) return "unavailable" satisfies SoloOverviewStatus;
  return queryErrors > 0 ? "error" : "ready";
}

export function isNavigationReady(input: {
  authenticated: boolean;
  hasServerMode: boolean;
  modeResolved: boolean;
}) {
  return input.hasServerMode || !input.authenticated || input.modeResolved;
}

export function getOverviewCount(count: number | null, fallbackLength: number) {
  return count ?? fallbackLength;
}

export function getCalendarDaysUntil(date: string, now = new Date()) {
  return differenceInCalendarDays(parseISO(date), startOfDay(now));
}

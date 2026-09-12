export function isNavigationItemActive(pathname: string, href: string, children: Array<{ href: string }> = []) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
}

export type SoloOverviewStatus = "ready" | "unavailable" | "error";

export function getSoloOverviewStatus(hasSession: boolean, queryErrors: number) {
  if (!hasSession) return "unavailable" satisfies SoloOverviewStatus;
  return queryErrors > 0 ? "error" : "ready";
}

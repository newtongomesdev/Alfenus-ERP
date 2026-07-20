import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  children,
  memberName,
  isAuthenticated,
}: {
  children: ReactNode;
  memberName: string | null;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:pl-72">
        <Header memberName={memberName} isAuthenticated={isAuthenticated} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, UserRound } from "lucide-react";

import { signOutAction, getLawFirmLogoAction } from "@/app/actions";
import { GlobalSearch } from "@/components/layout/global-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({ memberName, isAuthenticated }: { memberName: string | null; isAuthenticated?: boolean }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLawFirmLogoAction().then((url) => {
      if (active) {
        setLogoUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const initials = memberName
    ? memberName
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "AL";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      <MobileNav />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Notificações">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
        {isAuthenticated ?? Boolean(memberName) ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Abrir menu do usuário" />
              }
            >
              <Avatar className="size-8">
                {logoUrl && <AvatarImage src={logoUrl} alt={memberName || "Logo"} className="object-cover" />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{memberName || "Usuário"}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/configuracoes" />}>
                <UserRound className="size-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}

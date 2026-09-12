"use client";

import { useEffect, useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DeadlineCountdownProps {
  dueDate: string;
  dueTime?: string | null;
}

function buildDeadline(dueDate: string, dueTime?: string | null): Date {
  if (dueTime) {
    return parseISO(`${dueDate}T${dueTime}`);
  }
  return parseISO(`${dueDate}T23:59:59`);
}

function getLabel(diffMs: number): { text: string; className: string } {
  const now = new Date();

  if (diffMs < 0) {
    const days = Math.abs(differenceInDays(now, new Date(now.getTime() + diffMs)));
    return {
      text: `Vencido há ${days} ${days === 1 ? "dia" : "dias"}`,
      className: "text-destructive",
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days === 0) {
    return {
      text: hours <= 0 ? "Vence hoje" : `Vence em ${hours} ${hours === 1 ? "hora" : "horas"}`,
      className: "text-destructive",
    };
  }

  if (days === 1) {
    return {
      text: "Vence amanhã",
      className: "text-orange-500",
    };
  }

  if (days <= 3) {
    return {
      text: `Vence em ${days} dias`,
      className: "text-orange-500",
    };
  }

  if (days <= 7) {
    return {
      text: `Vence em ${days} dias`,
      className: "text-yellow-600 dark:text-yellow-500",
    };
  }

  return {
    text: `Vence em ${days} dias`,
    className: "text-green-600 dark:text-green-500",
  };
}

export function DeadlineCountdown({ dueDate, dueTime }: DeadlineCountdownProps) {
  const deadline = buildDeadline(dueDate, dueTime);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

  const label = getLabel(deadline.getTime() - now);

  return (
    <span className={cn("text-sm font-medium", label.className)}>
      {label.text}
    </span>
  );
}

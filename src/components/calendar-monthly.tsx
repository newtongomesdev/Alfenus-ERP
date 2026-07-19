"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalendarAppointment = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  type: string;
  status: string;
};

const typeColors: Record<string, string> = {
  audiencia: "bg-red-500",
  reuniao: "bg-blue-500",
  retorno: "bg-emerald-500",
  prazo: "bg-orange-500",
  outro: "bg-gray-400",
};

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface CalendarMonthlyProps {
  appointments: CalendarAppointment[];
  currentDate: string;
}

export function CalendarMonthly({ appointments, currentDate }: CalendarMonthlyProps) {
  const [refDate, setRefDate] = useState(() => new Date(currentDate));

  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      const dayKey = format(new Date(appt.startsAt), "yyyy-MM-dd");
      const existing = map.get(dayKey);
      if (existing) {
        existing.push(appt);
      } else {
        map.set(dayKey, [appt]);
      }
    }
    return map;
  }, [appointments]);

  const today = new Date();

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          onClick={() => setRefDate((d) => subMonths(d, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="text-sm font-semibold capitalize">
          {format(refDate, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button
          type="button"
          onClick={() => setRefDate((d) => addMonths(d, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayAppts = appointmentsByDay.get(dayKey) ?? [];
          const inMonth = isSameMonth(day, refDate);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dayKey}
              className={cn(
                "min-h-[72px] border-b border-r p-1.5 last:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "mb-1 text-xs font-medium",
                  isToday &&
                    "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className={cn(
                      "flex items-center gap-1 rounded px-1 py-0.5",
                      "text-[10px] leading-tight text-white truncate",
                      typeColors[appt.type] ?? "bg-gray-400",
                    )}
                    title={appt.title}
                  >
                    <span className="truncate">{appt.title}</span>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayAppts.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

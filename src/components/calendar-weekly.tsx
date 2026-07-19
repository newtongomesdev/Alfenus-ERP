"use client";

import { useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subWeeks,
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

const typeBgColors: Record<string, string> = {
  audiencia: "bg-red-500/90",
  reuniao: "bg-blue-500/90",
  retorno: "bg-emerald-500/90",
  prazo: "bg-orange-500/90",
  outro: "bg-gray-400/90",
};

const typeBorderColors: Record<string, string> = {
  audiencia: "border-red-600",
  reuniao: "border-blue-600",
  retorno: "border-emerald-600",
  prazo: "border-orange-600",
  outro: "border-gray-500",
};

const HOUR_START = 8;
const HOUR_END = 18;
const HOUR_HEIGHT = 64; // px per hour

function getHourOffset(dateStr: string): number {
  const d = parseISO(dateStr);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return ((hours - HOUR_START) + minutes / 60) * HOUR_HEIGHT;
}

function getDurationHeight(startStr: string, endStr: string | null): number {
  const start = parseISO(startStr);
  const end = endStr ? parseISO(endStr) : new Date(start.getTime() + 60 * 60 * 1000);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(diffHours * HOUR_HEIGHT, 24);
}

interface CalendarWeeklyProps {
  appointments: CalendarAppointment[];
  weekStart: string;
}

export function CalendarWeekly({ appointments, weekStart }: CalendarWeeklyProps) {
  const [refDate, setRefDate] = useState(() => parseISO(weekStart));

  const weekDays = useMemo(() => {
    const start = startOfWeek(refDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 0 }) });
  }, [refDate]);

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) result.push(h);
    return result;
  }, []);

  const today = new Date();

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      const dayKey = format(parseISO(appt.startsAt), "yyyy-MM-dd");
      const existing = map.get(dayKey);
      if (existing) {
        existing.push(appt);
      } else {
        map.set(dayKey, [appt]);
      }
    }
    return map;
  }, [appointments]);

  const totalHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT;

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          onClick={() => setRefDate((d) => subWeeks(d, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="text-sm font-semibold">
          {format(weekDays[0], "dd/MM", { locale: ptBR })} –{" "}
          {format(weekDays[6], "dd/MM yyyy", { locale: ptBR })}
        </h3>
        <button
          type="button"
          onClick={() => setRefDate((d) => addWeeks(d, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid border-b" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-r" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r px-1 py-2 text-center last:border-r-0",
                isToday && "bg-primary/5",
              )}
            >
              <div className="text-[10px] text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: "56px repeat(7, 1fr)", height: totalHeight }}
        >
          {/* Hour labels */}
          <div className="border-r">
            {hours.map((h) => (
              <div
                key={h}
                className="border-b text-right pr-1.5 text-[10px] text-muted-foreground"
                style={{ height: HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns with grid lines */}
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayAppts = appointmentsByDay.get(dayKey) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dayKey}
                className={cn("relative border-r last:border-r-0", isToday && "bg-primary/[0.02]")}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const top = getHourOffset(appt.startsAt);
                  const height = getDurationHeight(appt.startsAt, appt.endsAt);
                  const bg = typeBgColors[appt.type] ?? "bg-gray-400/90";
                  const border = typeBorderColors[appt.type] ?? "border-gray-500";

                  return (
                    <div
                      key={appt.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 overflow-hidden",
                        "text-[10px] leading-tight text-white",
                        bg,
                        border,
                      )}
                      style={{ top, height: Math.max(height, 20) }}
                      title={`${appt.title} (${appt.type})`}
                    >
                      <span className="font-medium truncate block">{appt.title}</span>
                      {height >= 36 && (
                        <span className="opacity-80">
                          {format(parseISO(appt.startsAt), "HH:mm")}
                          {appt.endsAt && ` – ${format(parseISO(appt.endsAt), "HH:mm")}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

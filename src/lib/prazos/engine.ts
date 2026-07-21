export type DeadlineCalculation = {
  id: string;
  lawFirmId: string;
  deadlineId: string | null;
  publicationId: string | null;
  tribunal: string;
  jurisdition: string | null;
  procedureType: string | null;
  ruleDescription: string | null;
  disponibilizedAt: string | null;
  publishedAt: string | null;
  knowledgeAt: string | null;
  startDate: string;
  quantity: number;
  unit: "dias" | "horas" | "meses" | "anos";
  businessDays: boolean;
  includeStartDate: boolean;
  includeEndDate: boolean;
  calculatedDate: string | null;
  adjustedDate: string | null;
  adjustmentReason: string | null;
  calendarId: string | null;
  holidaysConsidered: string[];
  suspensionsConsidered: string[];
  calculatedBy: string | null;
  calculatedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  status: string;
  version: number;
  previousVersionId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  lawFirmId: string;
  eventName: string;
  eventType:
    | "feriado"
    | "recesso"
    | "suspensao"
    | "indisponibilidade"
    | "sem_expediente";
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  description: string | null;
};

type DeadlineResult = {
  calculatedDate: string;
  holidaysConsidered: string[];
  suspensionsConsidered: string[];
};

// --- Helpers ---

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateRangeOverlaps(
  date: Date,
  eventStart: string,
  eventEnd: string
): boolean {
  const d = toDateString(date);
  return d >= eventStart && d <= eventEnd;
}

function matchesEvent(
  date: Date,
  events: CalendarEvent[],
  types?: CalendarEvent["eventType"][]
): boolean {
  return events.some((ev) => {
    if (types && !types.includes(ev.eventType)) return false;
    return dateRangeOverlaps(date, ev.startDate, ev.endDate);
  });
}

function getEventNames(
  date: Date,
  events: CalendarEvent[],
  types?: CalendarEvent["eventType"][]
): string[] {
  return events
    .filter((ev) => {
      if (types && !types.includes(ev.eventType)) return false;
      return dateRangeOverlaps(date, ev.startDate, ev.endDate);
    })
    .map((ev) => ev.eventName);
}

// --- Easter computation (Meeus/Jones/Butcher) ---

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// --- Public API ---

export function getBrazilianHolidays(year: number): CalendarEvent[] {
  const easter = computeEaster(year);
  const carnaval = new Date(easter);
  carnaval.setDate(carnaval.getDate() - 48);
  const sextaFeiraSanta = new Date(easter);
  sextaFeiraSanta.setDate(sextaFeiraSanta.getDate() - 2);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);

  const fixed: { date: string; name: string }[] = [
    { date: `${year}-01-01`, name: "Confraternização Universal" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia do Trabalho" },
    { date: `${year}-09-07`, name: "Independência do Brasil" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    { date: `${year}-12-25`, name: "Natal" },
  ];

  const variable: { date: string; name: string }[] = [
    { date: toDateString(carnaval), name: "Carnaval" },
    { date: toDateString(sextaFeiraSanta), name: "Sexta-feira Santa" },
    { date: toDateString(corpusChristi), name: "Corpus Christi" },
  ];

  const all = [...fixed, ...variable];

  return all.map((h) => ({
    id: `br-holiday-${year}-${h.date}`,
    calendarId: "brazil-national",
    lawFirmId: "",
    eventName: h.name,
    eventType: "feriado" as const,
    startDate: h.date,
    endDate: h.date,
    isRecurring: false,
    recurrenceRule: null,
    description: `Feriado nacional brasileiro - ${h.name}`,
  }));
}

export function isBusinessDay(
  date: Date,
  holidays: CalendarEvent[],
  suspensions: CalendarEvent[]
): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  if (matchesEvent(date, holidays, ["feriado"])) return false;
  if (
    matchesEvent(date, suspensions, [
      "recesso",
      "suspensao",
      "indisponibilidade",
      "sem_expediente",
    ])
  )
    return false;
  return true;
}

export function adjustForHolidays(
  date: Date,
  holidays: CalendarEvent[],
  suspensions: CalendarEvent[]
): {
  adjustedDate: Date;
  holidaysConsidered: string[];
  suspensionsConsidered: string[];
} {
  const holidaysConsidered: string[] = [];
  const suspensionsConsidered: string[] = [];
  const adjusted = new Date(date);

  while (!isBusinessDay(adjusted, holidays, suspensions)) {
    const hNames = getEventNames(adjusted, holidays, ["feriado"]);
    const sNames = getEventNames(adjusted, suspensions, [
      "recesso",
      "suspensao",
      "indisponibilidade",
      "sem_expediente",
    ]);
    for (const n of hNames) {
      if (!holidaysConsidered.includes(n)) holidaysConsidered.push(n);
    }
    for (const n of sNames) {
      if (!suspensionsConsidered.includes(n)) suspensionsConsidered.push(n);
    }
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return { adjustedDate: adjusted, holidaysConsidered, suspensionsConsidered };
}

export function calculateDeadline(params: {
  startDate: string;
  quantity: number;
  unit: "dias" | "horas" | "meses" | "anos";
  businessDays: boolean;
  includeStartDate: boolean;
  includeEndDate: boolean;
  holidays: CalendarEvent[];
  suspensions: CalendarEvent[];
}): DeadlineResult {
  const {
    startDate,
    quantity,
    unit,
    businessDays,
    includeStartDate,
    includeEndDate,
    holidays,
    suspensions,
  } = params;

  const holidaysConsidered: string[] = [];
  const suspensionsConsidered: string[] = [];

  let baseDate = parseDate(startDate);

  // If start date is not included, advance by 1 day
  if (!includeStartDate) {
    baseDate.setDate(baseDate.getDate() + 1);
  }

  let calculatedDate: Date;

  switch (unit) {
    case "horas": {
      // For hours, add quantity hours to the start date
      calculatedDate = new Date(baseDate);
      calculatedDate.setHours(calculatedDate.getHours() + quantity);
      break;
    }
    case "dias": {
      if (businessDays) {
        calculatedDate = new Date(baseDate);
        let remaining = quantity;
        while (remaining > 0) {
          calculatedDate.setDate(calculatedDate.getDate() + 1);
          if (isBusinessDay(calculatedDate, holidays, suspensions)) {
            remaining--;
          }
        }
      } else {
        calculatedDate = new Date(baseDate);
        calculatedDate.setDate(calculatedDate.getDate() + quantity);
      }
      break;
    }
    case "meses": {
      calculatedDate = new Date(baseDate);
      calculatedDate.setMonth(calculatedDate.getMonth() + quantity);
      break;
    }
    case "anos": {
      calculatedDate = new Date(baseDate);
      calculatedDate.setFullYear(calculatedDate.getFullYear() + quantity);
      break;
    }
  }

  // If business days mode, ensure result is a business day
  if (businessDays && unit !== "horas") {
    const adjusted = adjustForHolidays(calculatedDate, holidays, suspensions);
    calculatedDate = adjusted.adjustedDate;
    for (const n of adjusted.holidaysConsidered) {
      if (!holidaysConsidered.includes(n)) holidaysConsidered.push(n);
    }
    for (const n of adjusted.suspensionsConsidered) {
      if (!suspensionsConsidered.includes(n)) suspensionsConsidered.push(n);
    }
  }

  // If includeEndDate is false and we land on a non-business day in businessDays mode,
  // we already adjusted. If includeEndDate is true (default), the deadline is on calculatedDate.

  return {
    calculatedDate: toDateString(calculatedDate),
    holidaysConsidered,
    suspensionsConsidered,
  };
}

export function formatDeadlineResult(
  calculation: DeadlineCalculation
): string {
  const unitLabel =
    calculation.unit === "dias"
      ? calculation.businessDays
        ? "dias úteis"
        : "dias"
      : calculation.unit === "horas"
        ? "horas"
        : calculation.unit === "meses"
          ? "meses"
          : "anos";

  const targetDate = calculation.adjustedDate ?? calculation.calculatedDate;

  if (targetDate) {
    const formatted = parseDate(targetDate);
    const day = String(formatted.getDate()).padStart(2, "0");
    const month = String(formatted.getMonth() + 1).padStart(2, "0");
    const year = formatted.getFullYear();
    return `Prazo de ${calculation.quantity} ${unitLabel}: calculada para ${day}/${month}/${year}`;
  }

  return `Prazo de ${calculation.quantity} ${unitLabel}: cálculo pendente`;
}

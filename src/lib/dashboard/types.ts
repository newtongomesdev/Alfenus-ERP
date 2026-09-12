export type DashboardStatus = "missing-env" | "signed-out" | "missing-tenant" | "ready";

export type DashboardMetric = {
  label: string;
  value: number;
  format: "integer" | "currency";
  detail: string;
  trend?: string;
};

export type DashboardActivity = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type DashboardDeadline = {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
};

export type DashboardAppointment = {
  id: string;
  title: string;
  startsAt: string;
  type: string;
};

export type DashboardChartPoint = {
  label: string;
  previsto: number;
  recebido: number;
  atrasado: number;
};

export type DashboardOverview = {
  status: DashboardStatus;
  lawFirmName: string | null;
  memberName: string | null;
  metrics: DashboardMetric[];
  deadlines: DashboardDeadline[];
  appointments: DashboardAppointment[];
  activities: DashboardActivity[];
  chart: DashboardChartPoint[];
};

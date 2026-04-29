export type ObraStatus =
  | "planificada"
  | "en_progreso"
  | "pausada"
  | "completada"
  | "cancelada";

export interface Obra {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  status: ObraStatus;
  manager_id: number;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type Page = "panel" | "configuracion";

export interface Responsible {
  id: number;
  full_name: string;
  whatsapp_number: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

export type TaskStatus =
  | "pendiente"
  | "en_progreso"
  | "bloqueada"
  | "en_revision"
  | "completada"
  | "cancelada";

export interface Task {
  id: number;
  obra_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  responsible_id: number | null;
  estimated_progress: number;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  order_index: number;
  depends_on_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface HistorialEvento {
  id: number;
  obra_id: number | null;
  task_id: number | null;
  event_type: string;
  description: string;
  payload: Record<string, unknown> | null;
  triggered_by: string;
  created_at: string;
}

export type AlertType = "task_blocked" | "delay_risk";

export interface Alert {
  id: number;
  obra_id: number | null;
  task_id: number | null;
  type: AlertType;
  message: string;
  is_read: boolean;
  created_at: string;
}

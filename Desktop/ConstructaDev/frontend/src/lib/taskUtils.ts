import type { Task } from "../types";

// Devuelve true si la tarea tiene fecha de vencimiento pasada y no está terminada/cancelada.
export function isOverdue(task: Pick<Task, "due_date" | "status">): boolean {
  if (!task.due_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return (
    task.due_date < today &&
    task.status !== "completada" &&
    task.status !== "cancelada"
  );
}

// Calcula la diferencia en días entre dos fechas ISO. Positivo = b es posterior a a.
export function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

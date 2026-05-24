import type { Alert } from "../types";

// Devuelve la etiqueta legible en español para cada tipo de alerta.
// Para tipos sin etiqueta fija, infiere el label desde el texto del mensaje.
export function getAlertLabel(alert: Alert): string {
  switch (alert.type) {
    case "task_blocked":  return "Tarea bloqueada";
    case "task_overdue":  return "Tarea vencida";
    case "no_response":   return "Sin respuesta";
    default: {
      const msg = alert.message.toLowerCase();
      if (msg.includes("responsable")) return "Sin responsable";
      if (msg.includes("vencida"))     return "Tarea vencida";
      if (msg.includes("avance"))      return "Avance inconsistente";
      return "Riesgo de demora";
    }
  }
}

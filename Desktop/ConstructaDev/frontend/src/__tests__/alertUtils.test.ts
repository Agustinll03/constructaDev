import { describe, it, expect } from "vitest";
import { getAlertLabel } from "../lib/alertUtils";
import type { Alert } from "../types";

function crearAlerta(parcial: Partial<Alert>): Alert {
  return {
    id: 1,
    obra_id: 1,
    task_id: null,
    type: "delay_risk",
    message: "",
    is_read: false,
    created_at: "2025-01-01T00:00:00Z",
    ...parcial,
  };
}

describe("getAlertLabel", () => {
  // Verifica que el tipo task_blocked siempre devuelva su etiqueta fija.
  it("devuelve 'Tarea bloqueada' para task_blocked", () => {
    const alerta = crearAlerta({ type: "task_blocked", message: "algo" });
    expect(getAlertLabel(alerta)).toBe("Tarea bloqueada");
  });

  // Verifica que el tipo task_overdue siempre devuelva su etiqueta fija.
  it("devuelve 'Tarea vencida' para task_overdue", () => {
    const alerta = crearAlerta({ type: "task_overdue", message: "algo" });
    expect(getAlertLabel(alerta)).toBe("Tarea vencida");
  });

  // Verifica que el tipo no_response siempre devuelva su etiqueta fija.
  it("devuelve 'Sin respuesta' para no_response", () => {
    const alerta = crearAlerta({ type: "no_response", message: "algo" });
    expect(getAlertLabel(alerta)).toBe("Sin respuesta");
  });

  // Para delay_risk sin palabras clave en el mensaje, devuelve el fallback genérico.
  it("devuelve 'Riesgo de demora' para delay_risk sin palabras clave", () => {
    const alerta = crearAlerta({ type: "delay_risk", message: "hay una demora general" });
    expect(getAlertLabel(alerta)).toBe("Riesgo de demora");
  });

  // Verifica que el fallback por mensaje detecte la palabra "responsable".
  it("devuelve 'Sin responsable' cuando el mensaje contiene 'responsable'", () => {
    const alerta = crearAlerta({ type: "delay_risk", message: "La tarea no tiene responsable asignado" });
    expect(getAlertLabel(alerta)).toBe("Sin responsable");
  });

  // Verifica que el fallback detecte "avance" en el mensaje.
  it("devuelve 'Avance inconsistente' cuando el mensaje contiene 'avance'", () => {
    const alerta = crearAlerta({ type: "delay_risk", message: "El avance reportado es inconsistente" });
    expect(getAlertLabel(alerta)).toBe("Avance inconsistente");
  });

  // Verifica que el fallback detecte "vencida" en el mensaje aunque el tipo sea delay_risk.
  it("devuelve 'Tarea vencida' cuando el mensaje contiene 'vencida'", () => {
    const alerta = crearAlerta({ type: "delay_risk", message: "La tarea está vencida" });
    expect(getAlertLabel(alerta)).toBe("Tarea vencida");
  });
});

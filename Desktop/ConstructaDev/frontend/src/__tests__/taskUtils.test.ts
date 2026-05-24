import { describe, it, expect } from "vitest";
import { isOverdue, diffDays } from "../lib/taskUtils";
import type { Task } from "../types";

function crearTarea(parcial: Partial<Task>): Pick<Task, "due_date" | "status"> {
  return {
    due_date: null,
    status: "pendiente",
    ...parcial,
  };
}

describe("isOverdue", () => {
  // Verifica el caso principal: una tarea con fecha pasada y estado activo está vencida.
  it("devuelve true para tarea con fecha pasada y estado pendiente", () => {
    const tarea = crearTarea({ due_date: "2000-01-01", status: "pendiente" });
    expect(isOverdue(tarea)).toBe(true);
  });

  // Verifica que una tarea ya completada no se marque como vencida aunque la fecha pasó.
  it("devuelve false para tarea completada aunque la fecha haya pasado", () => {
    const tarea = crearTarea({ due_date: "2000-01-01", status: "completada" });
    expect(isOverdue(tarea)).toBe(false);
  });

  // Verifica que una tarea cancelada tampoco aparezca como vencida.
  it("devuelve false para tarea cancelada aunque la fecha haya pasado", () => {
    const tarea = crearTarea({ due_date: "2000-01-01", status: "cancelada" });
    expect(isOverdue(tarea)).toBe(false);
  });

  // Verifica que una tarea con fecha futura no sea considerada vencida.
  it("devuelve false para tarea con fecha futura", () => {
    const tarea = crearTarea({ due_date: "2099-12-31", status: "en_progreso" });
    expect(isOverdue(tarea)).toBe(false);
  });

  // Verifica que una tarea sin fecha asignada nunca esté vencida.
  it("devuelve false para tarea sin fecha de vencimiento", () => {
    const tarea = crearTarea({ due_date: null, status: "en_progreso" });
    expect(isOverdue(tarea)).toBe(false);
  });

  // Verifica que una tarea bloqueada con fecha pasada sí esté vencida.
  it("devuelve true para tarea bloqueada con fecha pasada", () => {
    const tarea = crearTarea({ due_date: "2000-01-01", status: "bloqueada" });
    expect(isOverdue(tarea)).toBe(true);
  });
});

describe("diffDays", () => {
  // Verifica el cálculo básico: la diferencia entre dos fechas conocidas.
  it("calcula correctamente la diferencia de 7 días", () => {
    expect(diffDays("2025-01-01", "2025-01-08")).toBe(7);
  });

  // Verifica que cuando b es anterior a a el resultado sea negativo.
  it("devuelve valor negativo cuando b es anterior a a", () => {
    expect(diffDays("2025-01-08", "2025-01-01")).toBe(-7);
  });

  // Verifica que dos fechas iguales devuelvan cero.
  it("devuelve 0 para fechas iguales", () => {
    expect(diffDays("2025-06-15", "2025-06-15")).toBe(0);
  });

  // Verifica un cálculo de diferencia de un año (365 días).
  it("calcula correctamente un año de diferencia", () => {
    expect(diffDays("2024-01-01", "2025-01-01")).toBe(366); // 2024 es bisiesto
  });
});

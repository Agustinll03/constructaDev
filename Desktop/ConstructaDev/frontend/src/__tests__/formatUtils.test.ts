import { describe, it, expect } from "vitest";
import { getInitials, avatarColor, fmtDateShort, relativeTime } from "../lib/formatUtils";

describe("getInitials", () => {
  // Verifica el caso más común: nombre y apellido → dos iniciales en mayúscula.
  it("devuelve dos iniciales para nombre y apellido", () => {
    expect(getInitials("Juan Pérez")).toBe("JP");
  });

  // Verifica que con un solo nombre devuelva solo una inicial.
  it("devuelve una inicial para nombre sin apellido", () => {
    expect(getInitials("Carlos")).toBe("C");
  });

  // Verifica que con más de dos palabras solo tome las dos primeras.
  it("toma solo las dos primeras palabras con nombres compuestos", () => {
    expect(getInitials("María de los Ángeles")).toBe("MD");
  });

  // Verifica que las iniciales siempre se devuelvan en mayúscula.
  it("convierte las iniciales a mayúsculas aunque el nombre esté en minúscula", () => {
    expect(getInitials("ana gómez")).toBe("AG");
  });

  // Verifica que un string vacío devuelva "?" en lugar de romper.
  it("devuelve ? para nombre vacío", () => {
    expect(getInitials("")).toBe("?");
  });
});

describe("avatarColor", () => {
  // Verifica que el mismo nombre siempre produzca el mismo color (determinismo).
  it("devuelve el mismo color para el mismo nombre", () => {
    const c1 = avatarColor("Juan");
    const c2 = avatarColor("Juan");
    expect(c1).toBe(c2);
  });

  // Verifica que distintos nombres produzcan colores (pueden ser iguales por colisión de hash,
  // pero al menos deben ser cadenas hex válidas).
  it("devuelve un color en formato hex", () => {
    const color = avatarColor("Ana");
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  // Verifica que el resultado para distintos nombres sea un string (no explota con nombres raros).
  it("funciona con nombres que contienen caracteres especiales", () => {
    expect(() => avatarColor("Ñoño García")).not.toThrow();
  });
});

describe("fmtDateShort", () => {
  // Verifica la conversión del formato de base de datos (YYYY-MM-DD) al formato local (DD/MM/YYYY).
  it("convierte YYYY-MM-DD a DD/MM/YYYY", () => {
    expect(fmtDateShort("2025-06-15")).toBe("15/06/2025");
  });

  // Verifica que null devuelva el guión largo, que es el placeholder visual en la UI.
  it("devuelve — para null", () => {
    expect(fmtDateShort(null)).toBe("—");
  });

  // Verifica que fechas con día y mes de un solo dígito mantengan el cero.
  it("mantiene ceros en día y mes de un dígito", () => {
    expect(fmtDateShort("2025-01-05")).toBe("05/01/2025");
  });
});

describe("relativeTime", () => {
  // Verifica que una fecha de hace segundos devuelva la frase genérica.
  it("devuelve 'hace unos segundos' para fechas muy recientes", () => {
    const iso = new Date(Date.now() - 10_000).toISOString(); // hace 10 seg
    expect(relativeTime(iso)).toBe("hace unos segundos");
  });

  // Verifica el formato para tiempos entre 1 y 60 minutos.
  it("devuelve 'hace X min' para fechas de hace minutos", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString(); // hace 5 min
    expect(relativeTime(iso)).toBe("hace 5 min");
  });

  // Verifica el formato para tiempos entre 1 y 24 horas.
  it("devuelve 'hace X h' para fechas de hace horas", () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString(); // hace 3 h
    expect(relativeTime(iso)).toBe("hace 3 h");
  });

  // Verifica que una fecha de ayer use la palabra "ayer" en lugar de un número.
  it("devuelve 'ayer' para fechas de hace entre 24 y 48 horas", () => {
    const iso = new Date(Date.now() - 30 * 3_600_000).toISOString(); // hace 30 h
    expect(relativeTime(iso)).toBe("ayer");
  });

  // Verifica el formato para fechas de más de dos días.
  it("devuelve 'hace X días' para fechas de más de 48 horas", () => {
    const iso = new Date(Date.now() - 5 * 86_400_000).toISOString(); // hace 5 días
    expect(relativeTime(iso)).toBe("hace 5 días");
  });
});

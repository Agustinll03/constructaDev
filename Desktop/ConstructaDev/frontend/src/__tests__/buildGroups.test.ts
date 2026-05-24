import { describe, it, expect } from "vitest";
import { buildGroups } from "../lib/documentUtils";
import type { Document } from "../types";

function crearDocumento(parcial: Partial<Document>): Document {
  return {
    id: 1,
    obra_id: 1,
    task_id: null,
    uploaded_by: 1,
    uploader_name: null,
    category: "plano",
    status: "pendiente",
    original_name: "plano.pdf",
    display_name: null,
    file_url: "http://ejemplo.com/plano.pdf",
    notes: null,
    version: 1,
    created_at: "2025-01-01T00:00:00Z",
    ...parcial,
  };
}

describe("buildGroups", () => {
  // Verifica que una lista vacía devuelva un objeto vacío sin errores.
  it("devuelve objeto vacío cuando no hay documentos", () => {
    const resultado = buildGroups([]);
    expect(resultado).toEqual({});
  });

  // Verifica que un documento quede dentro del grupo de su categoría.
  it("agrupa un documento dentro de su categoría", () => {
    const doc = crearDocumento({ id: 1, category: "plano", original_name: "plano.pdf", version: 1 });
    const resultado = buildGroups([doc]);
    expect(resultado["plano"]).toHaveLength(1);
    expect(resultado["plano"][0].versions).toHaveLength(1);
  });

  // Verifica que múltiples versiones del mismo archivo queden en el mismo grupo
  // y ordenadas de menor a mayor número de versión.
  it("agrupa versiones del mismo archivo juntas y ordenadas", () => {
    const v1 = crearDocumento({ id: 1, category: "plano", original_name: "plano.pdf", version: 1, created_at: "2025-01-01T00:00:00Z" });
    const v2 = crearDocumento({ id: 2, category: "plano", original_name: "plano.pdf", version: 2, created_at: "2025-02-01T00:00:00Z" });
    const resultado = buildGroups([v2, v1]); // se pasan al revés a propósito
    const grupo = resultado["plano"][0];
    expect(grupo.versions).toHaveLength(2);
    expect(grupo.versions[0].version).toBe(1); // la versión 1 debe ir primero
    expect(grupo.versions[1].version).toBe(2);
  });

  // Verifica que documentos de distintas categorías no se mezclen entre sí.
  it("separa documentos de categorías distintas", () => {
    const plano = crearDocumento({ id: 1, category: "plano", original_name: "plano.pdf", version: 1 });
    const contrato = crearDocumento({ id: 2, category: "contrato", original_name: "contrato.pdf", version: 1 });
    const resultado = buildGroups([plano, contrato]);
    expect(resultado["plano"]).toHaveLength(1);
    expect(resultado["contrato"]).toHaveLength(1);
  });

  // Verifica que el mismo nombre de archivo en categorías distintas genere grupos separados.
  // La clave de agrupación es categoría + nombre, no solo el nombre.
  it("no mezcla archivos con el mismo nombre pero distinta categoría", () => {
    const doc1 = crearDocumento({ id: 1, category: "plano", original_name: "archivo.pdf", version: 1 });
    const doc2 = crearDocumento({ id: 2, category: "contrato", original_name: "archivo.pdf", version: 1 });
    const resultado = buildGroups([doc1, doc2]);
    expect(resultado["plano"][0].versions).toHaveLength(1);
    expect(resultado["contrato"][0].versions).toHaveLength(1);
  });

  // Verifica que los grupos dentro de una misma categoría estén ordenados
  // alfabéticamente por nombre de archivo.
  it("ordena los grupos dentro de una categoría por nombre alfabético", () => {
    const b = crearDocumento({ id: 1, category: "plano", original_name: "beta.pdf", version: 1 });
    const a = crearDocumento({ id: 2, category: "plano", original_name: "alpha.pdf", version: 1 });
    const resultado = buildGroups([b, a]);
    expect(resultado["plano"][0].original_name).toBe("alpha.pdf");
    expect(resultado["plano"][1].original_name).toBe("beta.pdf");
  });
});

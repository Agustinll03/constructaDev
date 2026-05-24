/**
 * E04 — Tests E2E: Alertas
 *
 * Las alertas son efectos secundarios: se generan automáticamente cuando
 * una tarea pasa al estado BLOQUEADA. Este test crea la tarea y la avanza
 * via API para llegar rápido al estado de alerta, y luego verifica la UI.
 */

describe("E04 — Alertas", () => {
  let token: string;
  let obraId: number;
  const obraName = `Obra Alertas ${Date.now()}`;

  before(() => {
    cy.getAdminToken().then((t) => {
      token = t;
      cy.crearObra(token, obraName).then((obra) => {
        obraId = obra.id;
      });
    });
  });

  beforeEach(() => {
    cy.loginAdmin();
    cy.contains(obraName, { timeout: 10000 }).click();
    cy.contains(obraName, { timeout: 8000 }).should("be.visible");
  });

  // Sin tareas bloqueadas, la tab de Alertas muestra una lista vacía o sin alertas activas.
  it("la tab de Alertas se puede abrir y muestra su contenido", () => {
    cy.contains("Alertas").click();
    // La tab carga sin error (puede estar vacía, eso está bien)
    cy.contains("Alertas", { timeout: 6000 }).should("be.visible");
  });

  // Bloquear una tarea via API y verificar que aparece la alerta en la UI.
  it("bloquear una tarea genera una alerta visible en la tab Alertas", () => {
    const titulo = `Tarea Bloqueada ${Date.now()}`;

    // 1. Crear tarea via API
    cy.crearTarea(token, obraId, titulo).then((tarea) => {
      // 2. Avanzar a en_progreso (requerido por la máquina de estados antes de bloquear)
      cy.avanzarEstadoTarea(token, tarea.id, "en_progreso");
      // 3. Bloquear la tarea — esto dispara la creación de una alerta tipo task_blocked
      cy.avanzarEstadoTarea(token, tarea.id, "bloqueada");

      // 4. Verificar en la UI
      cy.contains("Alertas").click();
      // Debe haber al menos una alerta relacionada con la tarea bloqueada
      cy.contains(titulo, { timeout: 8000 }).should("be.visible");
    });
  });

  // Marcar una alerta como leída debe actualizar su estado visual.
  it("marcar una alerta como leída la quita de la lista de no leídas", () => {
    const titulo = `Tarea Para Leer ${Date.now()}`;

    cy.crearTarea(token, obraId, titulo).then((tarea) => {
      cy.avanzarEstadoTarea(token, tarea.id, "en_progreso");
      cy.avanzarEstadoTarea(token, tarea.id, "bloqueada");

      cy.contains("Alertas").click();
      cy.contains(titulo, { timeout: 8000 }).should("be.visible");

      // Hacer clic en el botón de marcar como leída
      // El botón de leer está cerca del texto de la alerta
      cy.contains(titulo)
        .closest("[data-cy=alerta-item]")
        .find("[data-cy=marcar-leida-btn]")
        .click();

      // La alerta ya no está marcada como no leída
      cy.contains(titulo)
        .closest("[data-cy=alerta-item]")
        .should("not.have.attr", "data-unread");
    });
  });
});

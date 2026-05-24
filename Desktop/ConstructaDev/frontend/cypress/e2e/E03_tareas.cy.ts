/**
 * E03 — Tests E2E: Gestión de tareas
 *
 * Verifica crear tareas via la UI y cambiar su estado usando el dropdown
 * de la tabla de tareas. La obra de prueba se crea via API en el before()
 * para no depender del wizard (ya testeado en E02).
 */

describe("E03 — Gestión de tareas", () => {
  let token: string;
  let obraId: number;
  let obraName: string;

  // Crea el usuario admin token y la obra de prueba UNA sola vez para todos los tests.
  before(() => {
    obraName = `Obra Tareas ${Date.now()}`;
    cy.getAdminToken().then((t) => {
      token = t;
      cy.crearObra(token, obraName).then((obra) => {
        obraId = obra.id;
      });
    });
  });

  // Antes de cada test: loguear y navegar al detalle de la obra.
  beforeEach(() => {
    cy.loginAdmin();
    cy.contains(obraName, { timeout: 10000 }).click();
    cy.contains(obraName, { timeout: 8000 }).should("be.visible");
  });

  // Crear una tarea nueva usando el botón de la UI y el formulario modal.
  it("crear una tarea nueva desde el botón de la obra", () => {
    cy.get("[data-cy=nueva-tarea-btn]").click();
    cy.get("[data-cy=task-title-input]").should("be.visible").type("Tarea E2E Cypress");
    cy.get("[data-cy=task-submit-btn]").click();
    // La tarea aparece en algún lugar de la página
    cy.contains("Tarea E2E Cypress", { timeout: 8000 }).should("be.visible");
  });

  // Intentar crear una tarea sin título debe mostrar error de validación, no crashear.
  it("intentar crear una tarea sin título muestra error de validación", () => {
    cy.get("[data-cy=nueva-tarea-btn]").click();
    cy.get("[data-cy=task-submit-btn]").click();
    // El modal sigue visible porque hay error (no se cerró)
    cy.get("[data-cy=task-title-input]").should("be.visible");
  });

  // Cambiar el estado de una tarea de pendiente a en progreso usando el dropdown.
  it("cambiar el estado de una tarea a en progreso via el dropdown", () => {
    const titulo = `Estado ${Date.now()}`;

    cy.crearTarea(token, obraId, titulo).then(() => {
      // Navegar a la tab de Tareas donde está la tabla con el dropdown
      cy.contains("Tareas").click();
      cy.contains(titulo, { timeout: 8000 }).should("be.visible");

      // Abrir el dropdown de estado de esa tarea específica
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click();

      // Seleccionar "En progreso" del menú desplegable
      cy.contains("En progreso").click();

      // El dropdown debe reflejar el nuevo estado
      cy.contains("tr", titulo)
        .find("[data-cy=status-toggle]")
        .should("contain", "En progreso");
    });
  });

  // Flujo completo: pendiente → en progreso → completada (la máquina de estados completa).
  it("flujo completo de estados: pendiente → en progreso → completada", () => {
    const titulo = `Flujo ${Date.now()}`;

    cy.crearTarea(token, obraId, titulo).then(() => {
      cy.contains("Tareas").click();
      cy.contains(titulo, { timeout: 8000 }).should("be.visible");

      // pendiente → en progreso
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click();
      cy.contains("En progreso").click();
      cy.contains("tr", titulo)
        .find("[data-cy=status-toggle]")
        .should("contain", "En progreso");

      // en progreso → completada
      cy.contains("tr", titulo).find("[data-cy=status-toggle]").click();
      cy.contains("Completada").click();
      cy.contains("tr", titulo)
        .find("[data-cy=status-toggle]")
        .should("contain", "Completada");
    });
  });
});

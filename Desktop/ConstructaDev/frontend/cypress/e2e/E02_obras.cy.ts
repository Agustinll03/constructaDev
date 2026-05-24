/**
 * E02 — Tests E2E: Gestión de obras
 *
 * Verifica la creación de obras via el wizard de 4 pasos y la navegación
 * al detalle de una obra existente. Usa cy.loginAdmin() para saltear el
 * login y enfocarse en el flujo de obras.
 */

describe("E02 — Gestión de obras", () => {

  beforeEach(() => {
    cy.loginAdmin();
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible");
  });

  // El portfolio vacío muestra el call-to-action para crear la primera obra.
  // (Solo aplica si el admin no tiene obras; si las tiene, el botón igual existe.)
  it("el botón de nueva obra está visible en el portfolio", () => {
    cy.get("[data-cy=nueva-obra-btn]").should("be.visible");
  });

  // Crear una obra completa a través del wizard de 4 pasos.
  // Pasos 2 y 3 (responsables y tareas) son opcionales y se omiten.
  it("crear una obra nueva via el wizard de configuración", () => {
    const obraName = `Cypress E2E ${Date.now()}`;

    cy.get("[data-cy=nueva-obra-btn]").click();

    // Paso 1: datos básicos — solo el nombre es obligatorio
    cy.get("[data-cy=obra-name-input]").should("be.visible").type(obraName);
    cy.contains("button", "Siguiente").click();

    // Paso 2: responsables — omitir
    cy.contains("button", "Siguiente").click();

    // Paso 3: tareas — omitir
    cy.contains("button", "Revisar y confirmar").click();

    // Paso 4: confirmación — crear
    cy.contains("button", "Crear obra y comenzar seguimiento").click();

    // La obra aparece en el portfolio
    cy.contains(obraName, { timeout: 12000 }).should("be.visible");
  });

  // Seleccionar una obra desde el portfolio navega a su detalle.
  it("seleccionar una obra existente navega a su detalle", () => {
    let token: string;
    const obraName = `Obra Detalle ${Date.now()}`;

    cy.getAdminToken().then((t) => {
      token = t;
      cy.crearObra(token, obraName).then(() => {
        cy.reload();
        cy.contains(obraName, { timeout: 10000 }).click();
        // El detalle muestra el nombre de la obra en el header
        cy.contains(obraName, { timeout: 8000 }).should("be.visible");
        // Y la tab Resumen está activa
        cy.contains("Resumen").should("be.visible");
      });
    });
  });
});

/**
 * E01 — Tests E2E: Login y autenticación
 *
 * Verifica el flujo completo de login/logout desde el navegador.
 * No necesita precondiciones en la BD porque usa las credenciales
 * del usuario admin configurado en cypress.env.json.
 */

describe("E01 — Login y autenticación", () => {

  // Sin sesión activa, la app debe mostrar la pantalla de login.
  it("sin sesión activa muestra la pantalla de login", () => {
    cy.visit("/");
    cy.get("[data-cy=email-input]").should("be.visible");
    cy.get("[data-cy=password-input]").should("be.visible");
    cy.get("[data-cy=submit-btn]").should("be.visible");
  });

  // Login con credenciales correctas debe navegar al portfolio.
  it("login exitoso con credenciales correctas navega al portfolio", () => {
    cy.visit("/");
    cy.get("[data-cy=email-input]").type(Cypress.env("ADMIN_EMAIL"));
    cy.get("[data-cy=password-input]").type(Cypress.env("ADMIN_PASSWORD"));
    cy.get("[data-cy=submit-btn]").click();
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible");
  });

  // Credenciales incorrectas deben mostrar el mensaje de error rojo.
  it("credenciales incorrectas muestran el mensaje de error", () => {
    cy.visit("/");
    cy.get("[data-cy=email-input]").type(Cypress.env("ADMIN_EMAIL"));
    cy.get("[data-cy=password-input]").type("contraseña_totalmente_incorrecta");
    cy.get("[data-cy=submit-btn]").click();
    cy.get("[data-cy=error-message]").should("be.visible");
    cy.get("[data-cy=error-message]").should("contain", "Credenciales inválidas");
  });

  // Un email que no existe también debe mostrar error, no un 500.
  it("email que no existe muestra error en lugar de crash", () => {
    cy.visit("/");
    cy.get("[data-cy=email-input]").type("noexiste@constructa.com");
    cy.get("[data-cy=password-input]").type("cualquiercontraseña");
    cy.get("[data-cy=submit-btn]").click();
    cy.get("[data-cy=error-message]").should("be.visible");
  });

  // Logout debe limpiar la sesión y volver a mostrar el login.
  it("logout cierra la sesión y regresa al login", () => {
    cy.loginAdmin();
    cy.contains("Mis obras", { timeout: 10000 }).should("be.visible");
    cy.get("[data-cy=logout-btn]").click();
    cy.get("[data-cy=email-input]").should("be.visible");
  });
});

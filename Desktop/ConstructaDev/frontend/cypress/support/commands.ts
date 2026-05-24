/// <reference types="cypress" />

const API = "http://localhost:8000/api/v1";

// Hace login via API e inyecta el token en la sesión del navegador.
// El onBeforeLoad corre antes de que React se monte, por eso useState
// que lee getToken() ya encuentra el token al inicializarse.
Cypress.Commands.add("loginAs", (email: string, password: string) => {
  cy.request("POST", `${API}/auth/login`, { email, password }).then(({ body }) => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("access_token", body.access_token);
        win.sessionStorage.setItem("access_token", body.access_token);
      },
    });
  });
});

// Atajo para loguear con el usuario admin configurado en cypress.env.json.
Cypress.Commands.add("loginAdmin", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.loginAs((Cypress.env as any)("ADMIN_EMAIL"), (Cypress.env as any)("ADMIN_PASSWORD"));
});

// Obtiene el token del admin via API para usarlo en cy.request() de precondiciones.
Cypress.Commands.add("getAdminToken", () => {
  return cy
    .request("POST", `${API}/auth/login`, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email: (Cypress.env as any)("ADMIN_EMAIL"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      password: (Cypress.env as any)("ADMIN_PASSWORD"),
    })
    .its("body.access_token");
});

// Crea una obra via API (precondición de tests que necesitan una obra existente).
Cypress.Commands.add("crearObra", (token: string, name: string) => {
  return cy
    .request({
      method: "POST",
      url: `${API}/obras`,
      headers: { Authorization: `Bearer ${token}` },
      body: { name },
    })
    .its("body");
});

// Crea una tarea via API dentro de una obra existente.
Cypress.Commands.add("crearTarea", (token: string, obraId: number, title: string) => {
  return cy
    .request({
      method: "POST",
      url: `${API}/tasks`,
      headers: { Authorization: `Bearer ${token}` },
      body: { obra_id: obraId, title },
    })
    .its("body");
});

// Cambia el estado de una tarea via API.
Cypress.Commands.add("avanzarEstadoTarea", (token: string, taskId: number, status: string) => {
  cy.request({
    method: "POST",
    url: `${API}/tasks/${taskId}/status`,
    headers: { Authorization: `Bearer ${token}` },
    body: { status, triggered_by: "cypress" },
  });
});

/// <reference types="cypress" />

// Declaraciones de los comandos personalizados de Cypress.
// Este archivo es leído automáticamente por TypeScript via cypress/tsconfig.json.
declare namespace Cypress {
  interface Chainable {
    loginAs(email: string, password: string): Chainable<void>;
    loginAdmin(): Chainable<void>;
    getAdminToken(): Chainable<string>;
    crearObra(token: string, name: string): Chainable<{ id: number; name: string }>;
    crearTarea(token: string, obraId: number, title: string): Chainable<{ id: number; title: string }>;
    avanzarEstadoTarea(token: string, taskId: number, status: string): Chainable<void>;
  }
}

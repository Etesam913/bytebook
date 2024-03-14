/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare global {
	namespace Cypress {
		interface Chainable {
			getByTestId(
				testId: string,
				options?: Partial<
					Cypress.Loggable &
						Cypress.Timeoutable &
						Cypress.Withinable &
						Cypress.Shadow
				>,
			): Chainable<JQuery<HTMLElement>>;
			deleteFolder(folderName: string): void;
		}
	}
}

Cypress.Commands.add("getByTestId", (testId, options) => {
	return cy.get(`[data-testid="${testId}"]`, options);
});

Cypress.Commands.add("deleteFolder", (folderName) => {
	cy.wait(1000);
	cy.get("body").then(($body) => {
		// Check if the element exists in the body
		if ($body.find(`[data-testid=delete_folder_button-${folderName}]`).length) {
			// If the element exists, then find the button and click it
			cy.getByTestId(`delete_folder_button-${folderName}`).click();
		}
	});
});

export type {};

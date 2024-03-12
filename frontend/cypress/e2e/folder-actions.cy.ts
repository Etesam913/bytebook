import { expect } from "chai";

describe("📁 folder actions", () => {
	it("creating a folder", () => {
		cy.visit("/");

		// Delete valid-folder-name if it exists from a previous test run
		cy.deleteFolder("valid-folder-name");

		// Opens the create folder dialog
		cy.getByTestId("create-folder-button").click();
		// Types in an incorrect folder name and checks for an error message
		cy.getByTestId("folder-name").type("invalid folder name*");
		cy.getByTestId("create-folder-dialog-button").click();
		cy.contains(
			"Invalid folder name. Folder names can only contain letters, numbers, spaces, hyphens, and underscores.",
		).should("exist");

		// Types in a correct folder name and checks for the folder to be created
		cy.getByTestId("folder-name").clear().type("valid-folder-name");
		cy.getByTestId("create-folder-dialog-button").click();
		cy.getByTestId("create-folder-dialog-button").should("not.exist");
		cy.getByTestId("folder-link=valid-folder-name").should("exist");
	});

	// it("deleting a folder", () => {
	// 	cy.visit("/");
	// 	cy.getByTestId("folder-link=valid-folder-name").should("exist");
	// 	cy.getByTestId("delete-folder-button=valid-folder-name").click();
	// 	cy.getByTestId("folder-link=valid-folder-name").should("not.exist");
	// });
});

// biome-ignore lint/complexity/noUselessEmptyExport: <explanation>
export type {};

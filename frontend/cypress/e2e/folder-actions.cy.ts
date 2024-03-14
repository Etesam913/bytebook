import { expect } from "chai";

describe("📁 folder actions", () => {
	it("creating a folder", () => {
		cy.visit("/");
		// Give wails time to load stuff in

		cy.deleteFolder("validfolder");

		// Opens the create folder dialog
		cy.getByTestId("create_folder_button").click();
		// Types in an incorrect folder name and checks for an error message
		cy.getByTestId("folder_name").type("invalid folder name*");
		cy.getByTestId("create_folder_dialog_button").click();
		cy.contains(
			"Invalid folder name. Folder names can only contain letters, numbers, spaces, hyphens, and underscores.",
		).should("exist");

		// Types in a correct folder name and checks for the folder to be created
		cy.getByTestId("folder_name").clear().type("validfolder");
		cy.getByTestId("create_folder_dialog_button").click();
		cy.getByTestId("create_folder_dialog_button").should("not.exist");
		cy.getByTestId("folder_link-validfolder").should("exist");
	});

	it("deleting a folder", () => {
		cy.visit("/");
		cy.getByTestId("folder_link-validfolder").should("exist");
		cy.getByTestId("delete_folder_button-validfolder").click();
		cy.getByTestId("folder_link-validfolder").should("not.exist");
	});
});

// biome-ignore lint/complexity/noUselessEmptyExport: <explanation>
export type {};

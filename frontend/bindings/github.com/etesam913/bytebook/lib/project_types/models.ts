// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Create as $Create} from "@wailsio/runtime";

export class ProjectSettingsJson {
    "pinnedNotes": string[];
    "projectPath": string;

    /** Creates a new ProjectSettingsJson instance. */
    constructor($$source: Partial<ProjectSettingsJson> = {}) {
        if (!("pinnedNotes" in $$source)) {
            this["pinnedNotes"] = [];
        }
        if (!("projectPath" in $$source)) {
            this["projectPath"] = "";
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new ProjectSettingsJson instance from a string or object.
     */
    static createFrom($$source: any = {}): ProjectSettingsJson {
        const $$createField0_0 = $$createType0;
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        if ("pinnedNotes" in $$parsedSource) {
            $$parsedSource["pinnedNotes"] = $$createField0_0($$parsedSource["pinnedNotes"]);
        }
        return new ProjectSettingsJson($$parsedSource as Partial<ProjectSettingsJson>);
    }
}

// Private type creation functions
const $$createType0 = $Create.Array($Create.Any);

// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Create as $Create} from "@wailsio/runtime";

export class AddFolderResponse {
    "success": boolean;
    "message": string;

    /** Creates a new AddFolderResponse instance. */
    constructor($$source: Partial<AddFolderResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new AddFolderResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): AddFolderResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new AddFolderResponse($$parsedSource as Partial<AddFolderResponse>);
    }
}

export class AttachmentResponse {
    "success": boolean;
    "message": string;
    "paths": string[];

    /** Creates a new AttachmentResponse instance. */
    constructor($$source: Partial<AttachmentResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("paths" in $$source)) {
            this["paths"] = [];
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new AttachmentResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): AttachmentResponse {
        const $$createField2_0 = $$createType0;
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        if ("paths" in $$parsedSource) {
            $$parsedSource["paths"] = $$createField2_0($$parsedSource["paths"]);
        }
        return new AttachmentResponse($$parsedSource as Partial<AttachmentResponse>);
    }
}

export class CodeResponse {
    "success": boolean;
    "message": string;
    "id": string;

    /** Creates a new CodeResponse instance. */
    constructor($$source: Partial<CodeResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("id" in $$source)) {
            this["id"] = "";
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new CodeResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): CodeResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new CodeResponse($$parsedSource as Partial<CodeResponse>);
    }
}

export class FolderResponse {
    "success": boolean;
    "message": string;
    "data": string[];

    /** Creates a new FolderResponse instance. */
    constructor($$source: Partial<FolderResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("data" in $$source)) {
            this["data"] = [];
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new FolderResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): FolderResponse {
        const $$createField2_0 = $$createType0;
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        if ("data" in $$parsedSource) {
            $$parsedSource["data"] = $$createField2_0($$parsedSource["data"]);
        }
        return new FolderResponse($$parsedSource as Partial<FolderResponse>);
    }
}

export class GitResponse {
    "success": boolean;
    "message": string;
    "error": any;

    /** Creates a new GitResponse instance. */
    constructor($$source: Partial<GitResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("error" in $$source)) {
            this["error"] = null;
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new GitResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): GitResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new GitResponse($$parsedSource as Partial<GitResponse>);
    }
}

export class MostRecentNoteResponse {
    "success": boolean;
    "message": string;

    /** Creates a new MostRecentNoteResponse instance. */
    constructor($$source: Partial<MostRecentNoteResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new MostRecentNoteResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): MostRecentNoteResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new MostRecentNoteResponse($$parsedSource as Partial<MostRecentNoteResponse>);
    }
}

export class NoteCountResponse {
    "success": boolean;
    "message": string;
    "data": number;

    /** Creates a new NoteCountResponse instance. */
    constructor($$source: Partial<NoteCountResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("data" in $$source)) {
            this["data"] = 0;
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new NoteCountResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): NoteCountResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new NoteCountResponse($$parsedSource as Partial<NoteCountResponse>);
    }
}

export class NoteMarkdownResponse {
    "success": boolean;
    "message": string;
    "data": string;

    /** Creates a new NoteMarkdownResponse instance. */
    constructor($$source: Partial<NoteMarkdownResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("data" in $$source)) {
            this["data"] = "";
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new NoteMarkdownResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): NoteMarkdownResponse {
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        return new NoteMarkdownResponse($$parsedSource as Partial<NoteMarkdownResponse>);
    }
}

export class NoteResponse {
    "success": boolean;
    "message": string;
    "data": string[];

    /** Creates a new NoteResponse instance. */
    constructor($$source: Partial<NoteResponse> = {}) {
        if (!("success" in $$source)) {
            this["success"] = false;
        }
        if (!("message" in $$source)) {
            this["message"] = "";
        }
        if (!("data" in $$source)) {
            this["data"] = [];
        }

        Object.assign(this, $$source);
    }

    /**
     * Creates a new NoteResponse instance from a string or object.
     */
    static createFrom($$source: any = {}): NoteResponse {
        const $$createField2_0 = $$createType0;
        let $$parsedSource = typeof $$source === 'string' ? JSON.parse($$source) : $$source;
        if ("data" in $$parsedSource) {
            $$parsedSource["data"] = $$createField2_0($$parsedSource["data"]);
        }
        return new NoteResponse($$parsedSource as Partial<NoteResponse>);
    }
}

/**
 * SortStrings represents the possible sort options as a custom type.
 */
export enum SortStrings {
    /**
     * The Go zero value for the underlying type of the enum.
     */
    $zero = "",

    /**
     * Constants representing each possible sort option.
     */
    DateUpdatedDesc = "date-updated-desc",
    DateUpdatedAsc = "date-updated-asc",
    DateCreatedDesc = "date-created-desc",
    DateCreatedAsc = "date-created-asc",
    FileNameAZ = "file-name-a-z",
    FileNameZA = "file-name-z-a",
    SizeDesc = "size-desc",
    SizeAsc = "size-asc",
};

// Private type creation functions
const $$createType0 = $Create.Array($Create.Any);

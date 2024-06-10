// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Call as $Call, Create as $Create} from "@wailsio/runtime";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import * as $models from "./models.js";

export function AddNoteToFolder(folderName: string, noteName: string): Promise<$models.AddFolderResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(257262677, folderName, noteName) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function GetNoteMarkdown(path: string): Promise<$models.NoteMarkdownResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(2442281646, path) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType1($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function GetNotes(folderName: string): Promise<$models.NoteResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(4001444448, folderName) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType2($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

/**
 * MoveToTrash moves the specified folders and notes to the trash directory.
 * Parameters:
 * 
 * 	folderAndNotes: A slice of strings representing the paths of the folders and notes to be moved.
 * 
 * Returns:
 * 
 * 	A MostRecentNoteResponse indicating the success or failure of the operation.
 */
export function MoveToTrash(folderAndNotes: string[]): Promise<$models.MostRecentNoteResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(891730313, folderAndNotes) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType3($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function RenameNote(folderName: string, oldNoteTitle: string, newNoteTitle: string): Promise<$models.NoteResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(2999546831, folderName, oldNoteTitle, newNoteTitle) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType2($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function SetNoteMarkdown(folderName: string, noteTitle: string, markdown: string): Promise<$models.NoteMarkdownResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(2956762362, folderName, noteTitle, markdown) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType1($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function ValidateMostRecentNotes(paths: string[]): Promise<string[]> & { cancel(): void } {
    let $resultPromise = $Call.ByID(2675478292, paths) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType4($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

// Private type creation functions
const $$createType0 = $models.AddFolderResponse.createFrom;
const $$createType1 = $models.NoteMarkdownResponse.createFrom;
const $$createType2 = $models.NoteResponse.createFrom;
const $$createType3 = $models.MostRecentNoteResponse.createFrom;
const $$createType4 = $Create.Array($Create.Any);

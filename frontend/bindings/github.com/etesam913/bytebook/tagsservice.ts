// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Call as $Call, Create as $Create} from "@wailsio/runtime";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import * as $models from "./models.js";

/**
 * AddPathToTag adds a specific note path to a given tag.
 * If the tag does not exist, it creates the tag and associates the note path with it.
 */
export function AddPathToTag(tagName: string, notePath: string): Promise<$models.TagResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(4080671835, tagName, notePath) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

/**
 * DeletePathFromTag removes a specific note path from a given tag.
 * If the tag no longer has any note paths associated with it, the tag folder is deleted.
 */
export function DeletePathFromTag(tagName: string, notePath: string): Promise<$models.TagResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1740782444, tagName, notePath) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

/**
 * GetNotesFromTag retrieves the note paths associated with a given tag name.
 * It reads the "notes.json" file within the tag's directory and returns the note paths.
 */
export function GetNotesFromTag(tagName: string): Promise<$models.TagResponseWithData> & { cancel(): void } {
    let $resultPromise = $Call.ByID(3414271919, tagName) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType1($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

/**
 * GetTags retrieves a list of all tag names in the project.
 * It scans the "tags" directory within the project path and returns the names of all subdirectories.
 */
export function GetTags(): Promise<$models.TagResponseWithData> & { cancel(): void } {
    let $resultPromise = $Call.ByID(4245036661) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType1($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

// Private type creation functions
const $$createType0 = $models.TagResponse.createFrom;
const $$createType1 = $models.TagResponseWithData.createFrom;

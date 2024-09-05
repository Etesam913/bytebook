// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Call as $Call, Create as $Create} from "@wailsio/runtime";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import * as $models from "./models.js";

export function AddAttachments(folder: string, note: string): Promise<$models.AttachmentResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1582761106, folder, note) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

/**
 * Copies the files from the selected folder to the project folder and returns the file paths
 */
export function AddFilePathsToProject(filePaths: string[], folderPath: string, notePath: string): Promise<string[]> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1805610708, filePaths, folderPath, notePath) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType1($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function CancelCode(nodeKey: string): Promise<boolean> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1362010910, nodeKey) as any;
    return $resultPromise;
}

export function RunCode(nodeKey: string, language: string, code: string, command: string): Promise<$models.CodeResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1444881027, nodeKey, language, code, command) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType2($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function SyncChangesWithRepo(username: string, accessToken: string): Promise<$models.GitResponse> & { cancel(): void } {
    let $resultPromise = $Call.ByID(1837210235, username, accessToken) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType3($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

// Private type creation functions
const $$createType0 = $models.AttachmentResponse.createFrom;
const $$createType1 = $Create.Array($Create.Any);
const $$createType2 = $models.CodeResponse.createFrom;
const $$createType3 = $models.GitResponse.createFrom;

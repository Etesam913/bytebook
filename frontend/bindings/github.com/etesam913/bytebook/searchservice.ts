// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import {Call as $Call, Create as $Create} from "@wailsio/runtime";

/**
 * Uses JaroWinklerSimilarity algorithm to rank file names off of a calculated similarity
 * metic.
 */
export function SearchFileNamesFromQuery(searchQuery: string): Promise<string[]> & { cancel(): void } {
    let $resultPromise = $Call.ByID(3592678195, searchQuery) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

export function SearchFileNamesFromQueryTrigram(searchQuery: string): Promise<string[]> & { cancel(): void } {
    let $resultPromise = $Call.ByID(4128915799, searchQuery) as any;
    let $typingPromise = $resultPromise.then(($result) => {
        return $$createType0($result);
    }) as any;
    $typingPromise.cancel = $resultPromise.cancel.bind($resultPromise);
    return $typingPromise;
}

// Private type creation functions
const $$createType0 = $Create.Array($Create.Any);

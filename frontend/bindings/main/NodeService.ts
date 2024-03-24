// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT

import {Call} from '@wailsio/runtime';
import {GitReponse} from './models';
import {NodeResponse} from './models';

export async function RunCode(language: string, code: string, command: string) : Promise<NodeResponse> {
	return Call.ByName("main.NodeService.RunCode", language, code, command);
}

export async function SyncChangesWithRepo() : Promise<GitReponse> {
	return Call.ByName("main.NodeService.SyncChangesWithRepo");
}

export async function UploadImage(folderPath: string, notePath: string) : Promise<string[]> {
	return Call.ByName("main.NodeService.UploadImage", folderPath, notePath);
}


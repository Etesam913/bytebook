import type { Dispatch, SetStateAction } from "react";
import { navigate } from "wouter/use-browser-location";
import { useWailsEvent } from "../utils/hooks";

export function useTrashDelete(setFiles: Dispatch<SetStateAction<string[]>>) {
	useWailsEvent("trash:delete", (body) => {
		const data = (body.data as { note: string }[][])[0];

		setFiles((prev) =>
			prev.filter((file) => !data.some(({ note }) => note === file)),
		);
		navigate("/trash");
	});
}
export function useTrashCreate(setFiles: Dispatch<SetStateAction<string[]>>) {
	useWailsEvent("trash:create", (body) => {
		const data = (body.data as { name: string }[])[0];
		setFiles((prev) => [...prev, data.name]);
	});
}

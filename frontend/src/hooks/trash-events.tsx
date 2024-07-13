import type { Dispatch, SetStateAction } from "react";
import { useWailsEvent } from "../utils/hooks";
import { navigate } from "wouter/use-browser-location";

export function useTrashDelete(setFiles: Dispatch<SetStateAction<string[]>>) {
	useWailsEvent("trash:delete", (body) => {
		const data = body.data as { note: string }[];

		setFiles((prev) =>
			prev.filter((file) => !data.some(({ note }) => note === file)),
		);
		navigate("/trash");
	});
}
export function useTrashCreate(setFiles: Dispatch<SetStateAction<string[]>>) {
	useWailsEvent("trash:create", (body) => {
		const data = body.data as { name: string };
		setFiles((prev) => [...prev, data.name]);
	});
}

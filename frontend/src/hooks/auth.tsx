import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { userDataAtomWithLocalStorage } from "../atoms";
import { useWailsEvent } from "../hooks/events";
import type { UserData } from "../types";
import { DEFAULT_SONNER_OPTIONS } from "../utils/general";

async function getUserData(customAccessToken?: string) {
	const accessToken = customAccessToken ?? localStorage.getItem("accessToken");
	if (!accessToken || accessToken === "null") return null;

	const userData = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const userDataJson = await userData.json();

	if (userData.status !== 200) {
		return null;
	}
	return {
		login: userDataJson.login,
		accessToken,
		avatarUrl: userDataJson.avatar_url,
		email: userDataJson.email,
	} satisfies UserData;
}

export function useUserData() {
	const setUserDataWithLocalStorage = useSetAtom(userDataAtomWithLocalStorage);

	useEffect(() => {
		async function userDataHelper() {
			const res = await getUserData();
			if (res) {
				setUserDataWithLocalStorage(res);
			}
		}
		userDataHelper();
	}, [setUserDataWithLocalStorage]);
}

export function useLoggedInEvent() {
	const setUserDataWithLocalStorage = useSetAtom(userDataAtomWithLocalStorage);
	useWailsEvent("auth:access-token", async (body) => {
		const accessToken = (body.data as string[])[0];

		try {
			const res = await getUserData(accessToken);

			if (res) {
				setUserDataWithLocalStorage(res);
			} else {
				throw new Error("Login Failed, Please try again later!");
			}
		} catch {
			toast.error(
				"Login Failed, Please try again later!",
				DEFAULT_SONNER_OPTIONS,
			);
		}
	});
}

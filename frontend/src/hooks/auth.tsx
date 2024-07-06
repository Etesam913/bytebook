import { toast } from "sonner";
import { useWailsEvent } from "../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

export function useIsLoggedIn() {
	useWailsEvent("auth:access-token", async (event) => {
		const accessToken = event.data as string;

		try {
			const userData = await fetch("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			const userDataJson = await userData.json();
			console.log(userDataJson);
			localStorage.setItem("accessToken", accessToken);
		} catch {
			toast.error(
				"Login Failed, Please try again later!",
				DEFAULT_SONNER_OPTIONS,
			);
		}
	});
}

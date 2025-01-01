import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai/react";
import { userDataAtomWithLocalStorage } from "../atoms";
import type { GithubRepositoryData } from "../types";

/**
 * Fetches the GitHub repositories for the authenticated user.
 *
 * @returns The query result containing the repositories.
 */
export function useGithubRepositoriesQuery() {
	const userData = useAtomValue(userDataAtomWithLocalStorage);
	return useQuery({
		queryKey: ["get-repositories"],
		queryFn: async () => {
			if (!userData?.accessToken) return [];
			const res = await fetch(
				"https://api.github.com/user/repos?per_page=100",
				{
					headers: {
						Authorization: `token ${userData.accessToken}`,
						Accept: "application/vnd.github+json",
					},
				},
			);
			const repositories = (await res.json()) as GithubRepositoryData[];
			return repositories;
		},
	});
}

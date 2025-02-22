import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Ufo } from "../../icons/ufo";

export function NotFound() {
	const queryClient = useQueryClient();
	const folders = (queryClient.getQueryData(["folders"]) ?? null) as
		| string[]
		| null;
	const alphabetizedFolders = folders?.sort((a, b) => a.localeCompare(b));

	return (
		<section className="flex flex-col items-center justify-center h-screen flex-1 gap-3 pb-16 px-3 text-center">
			<Ufo width={48} height={48} />
			<h1 className="text-2xl font-bold">
				Sorry, but this note does not exist.
			</h1>
			<p>
				Click{" "}
				<Link
					className="link"
					to={
						alphabetizedFolders && alphabetizedFolders.length > 0
							? `/${alphabetizedFolders[0]}`
							: "/"
					}
				>
					here
				</Link>{" "}
				to go back to your notes.
			</p>
		</section>
	);
}

import { useAtomValue } from "jotai";
import { Link } from "wouter";
import { foldersAtom } from "../../atoms";
import { Ufo } from "../../icons/ufo";

export function NotFound() {
	const folders = useAtomValue(foldersAtom);

	return (
		<section className="flex flex-col items-center justify-center h-screen flex-1 gap-3 pb-16 px-3 text-center">
			<Ufo width="3rem" height="3rem" />
			<h1 className="text-2xl font-bold">
				Sorry, but this note does not exist.
			</h1>
			<p>
				Click{" "}
				<Link
					className="link"
					to={folders && folders.length > 0 ? `/${folders[0]}` : "/"}
				>
					here
				</Link>{" "}
				to go back to the homepage
			</p>
		</section>
	);
}

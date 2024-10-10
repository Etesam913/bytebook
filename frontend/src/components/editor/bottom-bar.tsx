import { type ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import { timeSince } from "./utils/bottom-bar";

function BreadcrumbItem({ children, to }: { children: ReactNode; to: string }) {
	return (
		<Link
			to={to}
			className="flex items-center gap-1 whitespace-nowrap text-ellipsis overflow-hidden text-zinc-500 dark:text-zinc-300 hover:text-[currentColor]"
		>
			{children}
		</Link>
	);
}

export function BottomBar({
	frontmatter,
	folder,
	note,
}: { frontmatter: Record<string, string>; folder: string; note: string }) {
	const [lastUpdatedText, setLastUpdatedText] = useState("");

	useEffect(() => {
		const doesFrontmatterHaveLastUpdated = "lastUpdated" in frontmatter;
		if (!doesFrontmatterHaveLastUpdated) {
			return;
		}
		const interval = setInterval(() => {
			setLastUpdatedText(
				timeSince(new Date(frontmatter.lastUpdated), new Date()),
			);
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, [frontmatter]);

	return (
		<footer className="text-xs ml-[-4.5px] border-t border-gray-200 dark:border-gray-600 py-1.5 px-3 flex items-center gap-5 justify-between ">
			<span className="flex items-center gap-1">
				<BreadcrumbItem to={`/${folder}`}>
					<Folder width={18} height={18} /> {decodeURIComponent(folder)}
				</BreadcrumbItem>{" "}
				/{" "}
				<BreadcrumbItem to={`/${folder}/${note}?ext=md`}>
					<Note width={18} height={18} /> {note}
				</BreadcrumbItem>
			</span>

			{lastUpdatedText.length > 0 && (
				<p className="text-zinc-500 dark:text-zinc-300 whitespace-nowrap text-ellipsis overflow-hidden">
					Last Updated: {lastUpdatedText} ago
				</p>
			)}
		</footer>
	);
}

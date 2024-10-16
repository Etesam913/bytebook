import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useState,
} from "react";
import { Link } from "wouter";
import { XMark } from "../../icons/circle-xmark";
import { Folder } from "../../icons/folder";
import { Note } from "../../icons/page";
import TagPlus from "../../icons/tag-plus";
import { RenderNoteIcon } from "../../routes/notes-sidebar/render-note-icon";
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

function Tag({
	tagName,
	setTags,
}: { tagName: string; setTags: Dispatch<SetStateAction<string[]>> }) {
	return (
		<span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600">
			<p>{tagName}</p>
			<button
				type="button"
				onClick={() => setTags((prev) => prev.filter((tag) => tag !== tagName))}
			>
				<XMark width={12} height={12} />
			</button>
		</span>
	);
}

export function BottomBar({
	frontmatter,
	folder,
	note,
	ext,
}: {
	frontmatter?: Record<string, string>;
	folder: string;
	note: string;
	ext: string;
}) {
	const [lastUpdatedText, setLastUpdatedText] = useState("");

	const [tags, setTags] = useState<string[]>(["bwc", "wmaf"]);

	useEffect(() => {
		if (!frontmatter) return;
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

	const tagElements = tags.map((tagName) => {
		return <Tag key={tagName} tagName={tagName} setTags={setTags} />;
	});

	return (
		<footer className="text-xs ml-[-4.5px] border-t border-gray-200 dark:border-gray-600 py-1.5 px-3 flex items-center gap-4 overflow-x-auto overflow-y-hidden">
			<span className="flex items-center gap-1">
				<BreadcrumbItem to={`/${folder}`}>
					<Folder width={20} height={20} /> {decodeURIComponent(folder)}
				</BreadcrumbItem>{" "}
				/{" "}
				<BreadcrumbItem to={`/${folder}/${note}?ext=${ext}`}>
					{/* <Note width={18} height={18} /> */}
					<RenderNoteIcon
						noteNameWithExtension=""
						sidebarNoteName={""}
						fileExtension={ext}
					/>
					{note}
				</BreadcrumbItem>
			</span>
			<span className="flex items-center gap-2">
				<button
					type="button"
					className="flex whitespace-nowrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-150 dark:hover:bg-zinc-600"
				>
					<TagPlus height={15} width={15} /> Add Tag
				</button>
				{tagElements}
			</span>
			{lastUpdatedText.length > 0 && (
				<p className="text-zinc-500 dark:text-zinc-300 whitespace-nowrap text-ellipsis ml-auto">
					Last Updated: {lastUpdatedText} ago
				</p>
			)}
		</footer>
	);
}

import { type ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { XMark } from "../../icons/circle-xmark";
import { Folder } from "../../icons/folder";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	DeletePathFromTag,
	GetTagsForFolderAndNotePath,
} from "../../../bindings/github.com/etesam913/bytebook/tagsservice";
import { Loader } from "../../icons/loader";
import TagPlus from "../../icons/tag-plus";
import { RenderNoteIcon } from "../../routes/notes-sidebar/render-note-icon";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
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

function Tag({ tagName, onClick }: { tagName: string; onClick: () => void }) {
	return (
		<span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600">
			<p>{tagName}</p>
			<button type="button" onClick={onClick}>
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
	const queryClient = useQueryClient();

	const { data: tags, isLoading } = useQuery({
		queryKey: ["tags-fetching", folder, note, ext],
		queryFn: async () => {
			const res = await GetTagsForFolderAndNotePath(
				`${folder}/${note}?ext=${ext}`,
			);
			return res.data;
		},
	});

	const { mutate: deleteTag } = useMutation({
		mutationFn: async ({ tagName }: { tagName: string }) => {
			const res = await DeletePathFromTag(tagName, `${folder}/${note}.${ext}`);
			if (!res.success) {
				throw new Error(res.message);
			}
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
		onSuccess: () => {
			console.log("deleted");
			queryClient.invalidateQueries({
				queryKey: ["tags-fetching", folder, note, ext],
			});
		},
	});

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

	const tagElements = (tags ?? []).map((tagName) => {
		return (
			<Tag
				key={tagName}
				tagName={tagName}
				onClick={() => {
					deleteTag({ tagName });
				}}
			/>
		);
	});

	return (
		<footer className="text-xs ml-[-4.5px] border-t border-gray-200 dark:border-gray-600 py-1.5 px-3 flex items-center gap-4 overflow-x-auto overflow-y-hidden">
			<span className="flex items-center gap-1">
				<BreadcrumbItem to={`/${folder}`}>
					<Folder width={20} height={20} /> {decodeURIComponent(folder)}
				</BreadcrumbItem>{" "}
				/{" "}
				<BreadcrumbItem to={`/${folder}/${note}?ext=${ext}`}>
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

				{isLoading ? (
					<>
						<Loader height={14} width={14} />
						Loading Tags
					</>
				) : (
					tagElements
				)}
			</span>
			{lastUpdatedText.length > 0 && (
				<p className="text-zinc-500 dark:text-zinc-300 whitespace-nowrap text-ellipsis ml-auto">
					Last Updated: {lastUpdatedText} ago
				</p>
			)}
		</footer>
	);
}

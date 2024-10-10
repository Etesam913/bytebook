import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { useQuery } from "@tanstack/react-query";
import { CLICK_COMMAND, COMMAND_PRIORITY_HIGH } from "lexical";
import { useEffect, useMemo, useRef } from "react";
import { AddTag } from "../../../bindings/github.com/etesam913/bytebook/tagsservice";
import { TagIcon } from "../../icons/tag";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";

export function Tag({ tag, nodeKey }: { tag: string; nodeKey: string }) {
	const [match, data] = useRoute("/:folder/:note");
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const tagRef = useRef<HTMLDivElement>(null);

	const { folder, note } = useMemo(() => {
		let folder: null | string = null;
		let note: null | string = null;

		if (match) {
			folder = data.folder;
			note = data.note;
		}

		return { folder, note };
	}, [match, data]);

	const { data: didCreateTag } = useQuery({
		queryKey: ["tags", folder, note],
		queryFn: async () => {
			try {
				if (!folder || !note) {
					return false;
				}
				const res = await AddTag(tag, `${folder}/${note}.md`);
				console.log(res);

				if (!res.success) throw new Error(res.message);
				return true;
			} catch (e) {
				if (e instanceof Error) {
					toast.error(e.message, DEFAULT_SONNER_OPTIONS);
				} else {
					toast.error("Something went wrong!", DEFAULT_SONNER_OPTIONS);
				}
				return false;
			}
		},
	});

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						tagRef.current,
						setSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, []);

	if (!didCreateTag) return null;

	return (
		<div
			ref={tagRef}
			className={cn(
				"text-sm bg-zinc-150 dark:bg-zinc-700 w-fit py-0.5 px-2.5 cursor-pointer rounded-full inline-flex items-center gap-1.5 mx-1 translate-y-0.5",
				isSelected && "outline outline-2 outline-blue-500",
			)}
		>
			<TagIcon height={14} width={14} />
			<span>{tag}</span>
		</div>
	);
}

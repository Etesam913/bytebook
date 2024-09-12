import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UpdateProjectSettings } from "../../../../bindings/github.com/etesam913/bytebook/settingsservice";
import { getDefaultButtonVariants } from "../../../animations";
import { projectSettingsAtom } from "../../../atoms";
import { HorizontalDots } from "../../../icons/horizontal-dots";
import { PinTack2 } from "../../../icons/pin-tack-2";
import { Table } from "../../../icons/table";
import { useOnClickOutside } from "../../../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../../../utils/misc";
import { MotionIconButton } from "../../buttons";
import { DropdownItems } from "../../dropdown/dropdown-items";
import { SAVE_MARKDOWN_CONTENT } from "../plugins/save";

export function SettingsDropdown({
	folder,
	note,
	isToolbarDisabled,
	frontmatter,
}: {
	folder: string;
	note: string;
	isToolbarDisabled: boolean;
	frontmatter: Record<string, string>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
	const projectSettings = useAtomValue(projectSettingsAtom);
	const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);
	const [editor] = useLexicalComposerContext();

	return (
		<div className="ml-auto flex flex-col" ref={dropdownContainerRef}>
			<MotionIconButton
				onClick={() => setIsOpen((prev) => !prev)}
				{...getDefaultButtonVariants(isToolbarDisabled)}
			>
				<HorizontalDots />
			</MotionIconButton>

			<div className="relative flex flex-col items-end">
				<DropdownItems
					onChange={async (item) => {
						if (item.value === "pin-note" || item.value === "unpin-note") {
							const copyOfProjectSettings = { ...projectSettings };
							if (item.value === "pin-note") {
								copyOfProjectSettings.pinnedNotes.add(`${folder}/${note}.md`);
							} else {
								copyOfProjectSettings.pinnedNotes.delete(
									`${folder}/${note}.md`,
								);
							}

							try {
								const res = await UpdateProjectSettings({
									...copyOfProjectSettings,
									pinnedNotes: [...copyOfProjectSettings.pinnedNotes],
								});
								if (!res.success) {
									throw new Error(res.message);
								}
							} catch (e) {
								if (e instanceof Error) {
									toast.error(e.message, DEFAULT_SONNER_OPTIONS);
								}
							}
						} else if (
							item.value === "show-table-of-contents" ||
							item.value === "hide-table-of-contents"
						) {
							const copyOfFrontmatter = { ...frontmatter };
							copyOfFrontmatter.showTableOfContents =
								item.value === "show-table-of-contents" ? "true" : "false";

							editor.update(() => {
								editor.dispatchCommand(
									SAVE_MARKDOWN_CONTENT,
									copyOfFrontmatter,
								);
							});
						}
					}}
					className="w-60"
					items={[
						{
							value: isPinned ? "unpin-note" : "pin-note",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<PinTack2 className="min-w-5" />{" "}
									{isPinned ? "Unpin Note" : "Pin Note"}
								</span>
							),
						},
						{
							value:
								frontmatter.showTableOfContents === "true"
									? "hide-table-of-contents"
									: "show-table-of-contents",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<Table className="min-w-5" />{" "}
									{frontmatter.showTableOfContents === "true"
										? "Hide Table of Contents"
										: "Show Table of Contents"}
								</span>
							),
						},
					]}
					isOpen={isOpen}
					setIsOpen={setIsOpen}
					setFocusIndex={setFocusIndex}
					focusIndex={focusIndex}
				/>
			</div>
		</div>
	);
}

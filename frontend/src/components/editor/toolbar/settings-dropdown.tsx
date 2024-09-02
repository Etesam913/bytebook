import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UpdateProjectSettings } from "../../../../bindings/github.com/etesam913/bytebook/settingsservice";
import { getDefaultButtonVariants } from "../../../animations";
import { projectSettingsAtom } from "../../../atoms";
import { HorizontalDots } from "../../../icons/horizontal-dots";
import { PinTack2 } from "../../../icons/pin-tack-2";
import { useOnClickOutside } from "../../../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../../../utils/misc";
import { MotionIconButton } from "../../buttons";
import { DropdownItems } from "../../dropdown/dropdown-items";

export function SettingsDropdown({
	folder,
	note,
	isToolbarDisabled,
}: {
	folder: string;
	note: string;
	isToolbarDisabled: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
	const projectSettings = useAtomValue(projectSettingsAtom);
	const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);

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
						}
					}}
					className="w-40"
					items={[
						{
							value: isPinned ? "unpin-note" : "pin-note",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<PinTack2 /> {isPinned ? "Unpin Note" : "Pin Note"}
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

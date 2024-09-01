import { AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { getDefaultButtonVariants } from "../../../animations";
import { HorizontalDots } from "../../../icons/horizontal-dots";
import { PinTack2 } from "../../../icons/pin-tack-2";
import { useOnClickOutside } from "../../../utils/hooks";
import { MotionIconButton } from "../../buttons";
import { DropdownItems } from "../../dropdown/dropdown-items";

export function SettingsDropdown({
	isToolbarDisabled,
}: { isToolbarDisabled: boolean }) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));

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
					className="w-40"
					items={[
						{
							value: "pin-note",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<PinTack2 /> Pin Note
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

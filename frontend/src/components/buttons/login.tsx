import { Browser } from "@wailsio/runtime";
import { motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SyncChangesWithRepo } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { dialogDataAtom, userDataAtomWithLocalStorage } from "../../atoms";
import { ChevronDown } from "../../icons/chevron-down";
import { FileRefresh } from "../../icons/file-refresh";
import { Gear } from "../../icons/gear";
import OpenRectArrowIn from "../../icons/open-rect-arrow-in";
import { SettingsWindow } from "../../routes/settings";
import { useOnClickOutside } from "../../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
import { DropdownItems } from "../dropdown/dropdown-items";

export function LoginButton() {
	const userData = useAtomValue(userDataAtomWithLocalStorage);

	const [isUserOptionsOpen, setIsUserOptionsOpen] = useState(false);
	const [focusIndex, setFocusIndex] = useState(0);
	const setDialogData = useSetAtom(dialogDataAtom);

	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(dropdownContainerRef, () => setIsUserOptionsOpen(false));

	if (userData) {
		return (
			<div
				className="relative flex flex-col-reverse"
				ref={dropdownContainerRef}
			>
				<DropdownItems
					className="translate-y-[-3.25rem]"
					isOpen={isUserOptionsOpen}
					setIsOpen={setIsUserOptionsOpen}
					setFocusIndex={setFocusIndex}
					onChange={async ({ value }) => {
						if (value === "settings") {
							setDialogData({
								isOpen: true,
								title: "Settings",
								dialogClassName: "w-[min(55rem,90vw)]",
								children: () => <SettingsWindow />,
								onSubmit: null,
							});
						} else if (value === "sync-changes") {
							try {
								const res = await SyncChangesWithRepo(
									userData.login,
									userData.accessToken,
								);
								console.log(res);
								if (!res.success) throw new Error(res.message);

								toast.success(res.message, DEFAULT_SONNER_OPTIONS);
							} catch (e) {
								if (e instanceof Error)
									toast.error(e.message, DEFAULT_SONNER_OPTIONS);
							}
						}
					}}
					focusIndex={focusIndex}
					items={[
						{
							value: "sync-changes",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<FileRefresh /> Sync Changes
								</span>
							),
						},
						{
							value: "settings",
							label: (
								<span className="flex items-center gap-1.5 will-change-transform">
									<Gear /> Settings
								</span>
							),
						},
					]}
				/>

				<button
					onClick={() => setIsUserOptionsOpen((prev) => !prev)}
					type="button"
					className="w-full text-left text-sm bg-transparent text-ellipsis rounded-md flex items-center gap-1.5  hover:bg-zinc-100 hover:dark:bg-zinc-650 py-1 px-1.5 transition-colors"
				>
					<img
						src={userData.avatarUrl}
						alt="avatar"
						className="h-8 w-8 rounded-full"
					/>
					<div className="flex flex-col overflow-x-hidden">
						<span>{userData.login}</span>

						<p className="text-zinc-500 dark:text-zinc-300 text-xs overflow-hidden text-ellipsis  ">
							{userData.email}
						</p>
					</div>
					<motion.div
						initial={{ rotate: 0 }}
						className="ml-auto"
						animate={{ rotate: isUserOptionsOpen ? 0 : 180 }}
					>
						<ChevronDown
							className="min-w-[0.65rem] min-h-[0.65rem] text-zinc-500 dark:text-zinc-300"
							strokeWidth="3.5px"
							width="0.65rem"
							height="0.65rem"
						/>
					</motion.div>
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			className="w-full bg-transparent rounded-md flex gap-2 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 py-1 px-1.5 transition-colors"
			onClick={() => {
				Browser.OpenURL("http://localhost:8000/auth/github");
			}}
		>
			<OpenRectArrowIn className="h-4 w-4" />
			<span>Login To GitHub</span>
		</button>
	);
}

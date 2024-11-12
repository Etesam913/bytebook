import { useSetAtom } from "jotai/react";
import { dialogDataAtom } from "../../atoms";
import { Gear } from "../../icons/gear";
import { SettingsDialog } from "../settings-dialog";

export function SettingsButton() {
	const setDialogData = useSetAtom(dialogDataAtom);
	return (
		<button
			type="button"
			onClick={() => {
				setDialogData({
					isOpen: true,
					title: "Settings",
					dialogClassName: "w-[min(45rem,90vw)]",
					children: () => <SettingsDialog />,
					onSubmit: null,
				});
			}}
			className="flex gap-1 items-center hover:bg-zinc-100 hover:dark:bg-zinc-650 p-1 rounded-md transition-colors"
		>
			<Gear /> Settings
		</button>
	);
}

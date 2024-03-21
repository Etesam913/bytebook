import { useState, type Dispatch, type SetStateAction } from "react";
import { Dialog, ErrorText } from "../dialog";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { FloppyDisk } from "../../icons/floppy-disk";

export function CodeDialog({
	isCodeSettingsOpen,
	setIsCodeSettingsOpen,
}: {
	isCodeSettingsOpen: boolean;
	setIsCodeSettingsOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const [errorText, setErrorText] = useState("");

	return (
		<Dialog
			handleSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);
				const runCommand = formData.get("run-command");
				console.log(runCommand);
				if (runCommand && typeof runCommand === "string") {
					if (runCommand.trim().length === 0) {
						console.log("deez");
						setErrorText("Run command cannot be empty");
						return;
					}
					setErrorText("");
				}
			}}
			title="Code Block Settings"
			isOpen={isCodeSettingsOpen}
			setIsOpen={setIsCodeSettingsOpen}
		>
			<div className="flex flex-col">
				<label className="pb-2 cursor-pointer" htmlFor="run-command">
					Run Script Command
				</label>
				<input
					name="run-command"
					defaultValue="node"
					placeholder="node"
					maxLength={200}
					className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full font-code"
					id="run-command"
					type="text"
				/>

				<section className="w-full px-[0.5rem] mt-4 flex flex-col gap-1 ">
					<ErrorText errorText={errorText} />
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants()}
						className="w-full text-center flex items-center gap-2 justify-center flex-wrap "
					>
						Save Code Settings <FloppyDisk />
					</MotionButton>
				</section>
			</div>
		</Dialog>
	);
}

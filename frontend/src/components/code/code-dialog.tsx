import { type Dispatch, type SetStateAction, useState } from "react";
import { FloppyDisk } from "../../icons/floppy-disk";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dialog, ErrorText } from "../dialog";

export function CodeDialog({
	isCodeSettingsOpen,
	setIsCodeSettingsOpen,
	command,
	setCommand,
	writeCommandToNode,
}: {
	isCodeSettingsOpen: boolean;
	setIsCodeSettingsOpen: Dispatch<SetStateAction<boolean>>;
	command: string;
	setCommand: Dispatch<SetStateAction<string>>;
	writeCommandToNode: (command: string) => void;
}) {
	const [errorText, setErrorText] = useState("");
	const [curCommand, setCurCommand] = useState(command);

	return (
		<Dialog
			handleSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);
				const runCommand = formData.get("run-command");

				if (runCommand && typeof runCommand === "string") {
					if (runCommand.trim().length === 0) {
						setErrorText("Run command cannot be empty");
						return;
					}
					setErrorText("");
					setIsCodeSettingsOpen(false);
					setCommand(runCommand);
					writeCommandToNode(runCommand);
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
					placeholder="node"
					maxLength={200}
					className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full font-code"
					id="run-command"
					type="text"
					value={curCommand}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							e.preventDefault();
							setIsCodeSettingsOpen(false);
						}
						e.stopPropagation();
					}}
					onChange={(e) => {
						setCurCommand(e.target.value);
					}}
				/>
				<p className=" text-sm text-zinc-400">
					{curCommand} &#123;fileName&#125;
				</p>
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

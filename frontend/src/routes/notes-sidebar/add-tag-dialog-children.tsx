import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { MotionButton } from "../../components/buttons";
import { Input } from "../../components/input";
import { XMark } from "../../icons/circle-xmark";
import TagPlus from "../../icons/tag-plus";

function DialogTag({
	tagName,
	setTags,
}: { tagName: string; setTags: Dispatch<SetStateAction<string[]>> }) {
	return (
		<span className="flex items-center text-xs rounded-full gap-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600">
			{tagName}
			<button
				type="button"
				onClick={() => setTags((prev) => prev.filter((tag) => tag !== tagName))}
			>
				<XMark height={15} width={15} />
			</button>
			<input type="hidden" name="tags" value={tagName} />
		</span>
	);
}

function addTag(
	element: HTMLInputElement,
	tags: string[],
	setTags: Dispatch<SetStateAction<string[]>>,
	setErrorText: Dispatch<SetStateAction<string>>,
) {
	const tagName = element.value;
	if (tagName.trim().length === 0) {
		setErrorText("Tag name cannot be empty.");
		return;
	}

	if (tagName.includes("#")) {
		setErrorText("Tag name cannot have '#' in it.");
		return;
	}
	if (tags.includes(tagName)) {
		setErrorText("Tag name already exists.");
		return;
	}
	console.log(setTags, "tags should be set");
	setTags((prev) => [...prev, tagName]);
	element.value = "";
	setErrorText("");
}

export function AddTagDialogChildren({
	onSubmitErrorText,
}: {
	onSubmitErrorText: string;
}) {
	const [errorText, setErrorText] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [tags, setTags] = useState<string[]>([]);

	return (
		<>
			<fieldset className="flex items-center gap-3">
				<Input
					ref={inputRef}
					labelProps={{ htmlFor: "tag-name" }}
					inputProps={{
						id: "tag-name",
						name: "tag-name",
						placeholder: "Type Tag Name Here",
						autoFocus: true,
						className: "flex-1",

						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addTag(
									e.target as HTMLInputElement,
									tags,
									setTags,
									setErrorText,
								);
							}
						},
					}}
				/>
				<MotionButton
					{...getDefaultButtonVariants()}
					type="button"
					onClick={() => {
						if (inputRef.current)
							addTag(inputRef.current, tags, setTags, setErrorText);
					}}
				>
					Add Tag
				</MotionButton>
			</fieldset>
			{(errorText || tags.length > 0 || onSubmitErrorText.length > 0) && (
				<fieldset className="flex flex-col gap-2">
					{errorText && <p className="text-red-500 text-sm">{errorText}</p>}
					{tags.length > 0 && (
						<section className="flex gap-2">
							{tags.map((tagName) => (
								<DialogTag key={tagName} tagName={tagName} setTags={setTags} />
							))}
						</section>
					)}
					{onSubmitErrorText.length > 0 && (
						<p className="text-red-500 text-sm">{onSubmitErrorText}</p>
					)}
				</fieldset>
			)}
			<MotionButton
				{...getDefaultButtonVariants()}
				type="submit"
				className="w-[calc(100%-1.5rem)] mx-auto justify-center"
			>
				<TagPlus />
				Confirm Add Tags
			</MotionButton>
		</>
	);
}

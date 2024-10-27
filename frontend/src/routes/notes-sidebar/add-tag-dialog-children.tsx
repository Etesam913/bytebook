import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { MotionButton } from "../../components/buttons";
import { Combobox } from "../../components/combobox";
import { useTagsQuery } from "../../hooks/tag-events";
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
	setCurrentTag: Dispatch<SetStateAction<string>>,
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
	setTags((prev) => [...prev, tagName]);
	setCurrentTag("");
	setErrorText("");
}

export function AddTagDialogChildren({
	onSubmitErrorText,
}: {
	onSubmitErrorText: string;
}) {
	const [errorText, setErrorText] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [addedTags, setAddedTags] = useState<string[]>([]);
	const { data: tags } = useTagsQuery();

	const [currentTag, setCurrentTag] = useState("");

	const dropdownItems = (tags ?? [])
		.filter((tag) => {
			const inputValue = inputRef.current?.value.toLowerCase().trim() ?? "";
			const tagValue = tag.toLowerCase().trim();

			return (
				tagValue.startsWith(inputValue) &&
				!addedTags.includes(tag) &&
				!addedTags.includes(tagValue) &&
				// inputValue.length > 0 &&
				!tag.includes("#")
			);
		})
		.map((tag) => ({ value: tag, label: tag }))
		.slice(0, 7);

	return (
		<>
			<fieldset className="flex items-center gap-3">
				<div className="relative flex-1 flex">
					<Combobox
						ref={inputRef}
						labelProps={{ htmlFor: "tag-name" }}
						inputProps={{
							id: "tag-name",
							name: "tag-name",
							placeholder: "Type Tag Name Here",
							autoFocus: true,
							className: "flex-1",
							value: currentTag,
							autoCapitalize: "off",
							spellCheck: false,
							setState: setCurrentTag,
							onChange: (e) => {
								setCurrentTag(e.target.value);
							},

							onKeyDown: (e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addTag(
										e.target as HTMLInputElement,
										setCurrentTag,
										addedTags,
										setAddedTags,
										setErrorText,
									);
								}
							},
						}}
						items={dropdownItems}
					/>
				</div>
				<MotionButton
					{...getDefaultButtonVariants()}
					type="button"
					onClick={() => {
						if (inputRef.current)
							addTag(
								inputRef.current,
								setCurrentTag,
								addedTags,
								setAddedTags,
								setErrorText,
							);
					}}
				>
					Add Tag
				</MotionButton>
			</fieldset>
			{(errorText || addedTags.length > 0 || onSubmitErrorText.length > 0) && (
				<fieldset className="flex flex-col gap-2">
					{errorText && <p className="text-red-500 text-sm">{errorText}</p>}
					{addedTags.length > 0 && (
						<section className="flex gap-2 flex-wrap">
							{addedTags.map((tagName) => (
								<DialogTag
									key={tagName}
									tagName={tagName}
									setTags={setAddedTags}
								/>
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

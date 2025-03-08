// import {
// 	type Dispatch,
// 	type SetStateAction,
// 	useEffect,
// 	useMemo,
// 	useRef,
// 	useState,
// } from "react";
// import { getDefaultButtonVariants } from "../../animations";
// import { MotionButton } from "../../components/buttons";
// import { Input } from "../../components/input";
// import { useTagsForNotesQuery, useTagsQuery } from "../../hooks/tag-events";
// import { Loader } from "../../icons/loader";
// import TagPlus from "../../icons/tag-plus";
// import { DialogTag } from "./dialog-tag";

// function SelectedTagInput({
// 	tag,
// 	selectedTags,
// 	setSelectedTags,
// 	countOfTag,
// 	totalSelected,
// }: {
// 	tag: string;
// 	selectedTags: Set<string>;
// 	setSelectedTags: Dispatch<SetStateAction<Set<string>>>;
// 	// New props:
// 	countOfTag: number; // How many of the selected notes currently have this tag
// 	totalSelected: number; // The size of the selection range
// }) {
// 	const inputRef = useRef<HTMLInputElement>(null);

// 	// Set the indeterminate state based on whether the tag appears in only some of the selection
// 	useEffect(() => {
// 		if (inputRef.current) {
// 			inputRef.current.indeterminate =
// 				countOfTag > 0 && countOfTag < totalSelected;
// 		}
// 	}, [countOfTag, totalSelected]);

// 	return (
// 		<input
// 			ref={inputRef}
// 			id={tag}
// 			name={tag}
// 			type="checkbox"
// 			className="mr-2"
// 			checked={selectedTags.has(tag)}
// 			onChange={(e) => {
// 				if (e.target.checked) {
// 					setSelectedTags((prev) => new Set([...prev, tag]));
// 				} else {
// 					setSelectedTags(
// 						(prev) => new Set([...prev].filter((t) => t !== tag)),
// 					);
// 				}
// 			}}
// 		/>
// 	);
// }

// export function EditTagDialogChildren({
// 	onSubmitErrorText,
// 	selectionRange,
// 	curFolder,
// }: {
// 	onSubmitErrorText: string;
// 	selectionRange: Set<string>;
// 	curFolder: string;
// }) {
// 	const [errorText, setErrorText] = useState<string>("");
// 	const [addedTags, setAddedTags] = useState<string[]>([]);
// 	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
// 	const { data: tags } = useTagsQuery();
// 	const [tagSearchText, setTagSearchText] = useState("");
// 	const filteredTags =
// 		tags?.filter((tag) => tag.includes(tagSearchText.trim().toLowerCase())) ??
// 		[];

// 	const { data: tagsForNotes, isLoading } = useTagsForNotesQuery(
// 		curFolder,
// 		Array.from(selectionRange).map((note) => note.split("note:")[1]),
// 	);

// 	/**
// 	 * Build a map from tag -> number of selected notes that have that tag.
// 	 */
// 	const tagCountMap = useMemo(() => {
// 		if (!tagsForNotes) return {};
// 		const map: Record<string, number> = {};

// 		// For each selected note, increment the count for each tag that note contains
// 		for (const note of selectionRange) {
// 			const noteName = note.split("note:")[1];
// 			const noteTags = tagsForNotes[`${curFolder}/${noteName}`] ?? [];
// 			for (const t of noteTags) {
// 				map[t] = (map[t] ?? 0) + 1;
// 			}
// 		}
// 		return map;
// 	}, [tagsForNotes, selectionRange]);

// 	/**
// 	 * Using tagsForNotes, create a deduplicated set of tags
// 	 * found across all selected notes.
// 	 */
// 	const dedupedTagsForNotes = useMemo(
// 		() => new Set(Object.values(tagsForNotes ?? {}).flat()),
// 		[tagsForNotes],
// 	);

// 	useEffect(() => {
// 		// Set the overall selected tags from the union of tags across all notes.
// 		setSelectedTags(dedupedTagsForNotes);
// 	}, [dedupedTagsForNotes]);

// 	return (
// 		<>
// 			<fieldset className="flex flex-col gap-2">
// 				<Input
// 					labelProps={{}}
// 					inputProps={{
// 						placeholder: "Search for a tag",
// 						onChange: (e) => setTagSearchText(e.target.value),
// 						className: "w-full",
// 					}}
// 				/>
// 				{isLoading && <Loader />}
// 				{!isLoading && (
// 					<div className="h-48 overflow-y-auto">
// 						{filteredTags.length > 0 ? (
// 							<ul className="ml-2">
// 								{filteredTags.map((tag) => {
// 									const countOfTag = tagCountMap[tag] ?? 0;

// 									return (
// 										<li key={tag} className="flex items-center py-0.5">
// 											<SelectedTagInput
// 												tag={tag}
// 												selectedTags={selectedTags}
// 												setSelectedTags={setSelectedTags}
// 												// Pass down counts so the child can determine if it's partially checked
// 												countOfTag={countOfTag}
// 												totalSelected={selectionRange.size}
// 											/>
// 											<label htmlFor={tag}>{tag}</label>
// 										</li>
// 									);
// 								})}
// 							</ul>
// 						) : (
// 							<p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
// 								No tags found
// 							</p>
// 						)}
// 					</div>
// 				)}
// 			</fieldset>

// 			{(errorText || addedTags.length > 0 || onSubmitErrorText.length > 0) && (
// 				<fieldset className="flex flex-col gap-2">
// 					{errorText && <p className="text-red-500 text-sm">{errorText}</p>}
// 					{addedTags.length > 0 && (
// 						<section className="flex gap-2 flex-wrap">
// 							{addedTags.map((tagName) => (
// 								<DialogTag
// 									key={tagName}
// 									tagName={tagName}
// 									setTags={setAddedTags}
// 								/>
// 							))}
// 						</section>
// 					)}
// 					{onSubmitErrorText.length > 0 && (
// 						<p className="text-red-500 text-sm">{onSubmitErrorText}</p>
// 					)}
// 				</fieldset>
// 			)}
// 			<MotionButton
// 				{...getDefaultButtonVariants()}
// 				type="submit"
// 				className="w-[calc(100%-1.5rem)] mx-auto justify-center"
// 			>
// 				<TagPlus />
// 				Save
// 			</MotionButton>
// 		</>
// 	);
// }

import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { cn } from "../../utils/string-formatting";

export class DropdownPickerOption extends MenuOption {
	// What shows up in the editor
	title: string;
	// Icon for display
	icon?: JSX.Element;
	// For extra searching.
	keywords: Array<string>;
	// TBD
	keyboardShortcut?: string;
	// What happens when you select this option?
	onSelect: (queryString: string) => void;

	constructor(
		title: string,
		options: {
			icon?: JSX.Element;
			keywords?: Array<string>;
			keyboardShortcut?: string;
			onSelect: (queryString: string) => void;
		},
	) {
		super(title);
		this.title = title;
		this.keywords = options.keywords || [];
		this.icon = options.icon;
		this.keyboardShortcut = options.keyboardShortcut;
		this.onSelect = options.onSelect.bind(this);
	}
}

export function DropdownPickerMenuItem({
	index,
	isSelected,
	onClick,
	onMouseEnter,
	option,
}: {
	index: number;
	isSelected: boolean;
	onClick: () => void;
	onMouseEnter: () => void;
	option: DropdownPickerOption;
}) {
	return (
		<li
			key={option.key}
			tabIndex={-1}
			className={cn(
				"flex items-center gap-2 text-left cursor-pointer rounded-md px-[7px] py-[2px] hover:bg-zinc-100 dark:hover:bg-zinc-650 ",
				isSelected &&
					"bg-zinc-150 dark:bg-zinc-600 hover:bg-zinc-150 dark:hover:bg-zinc-600",
			)}
			ref={option.setRefElement}
			aria-selected={isSelected}
			id={`typeahead-item-${index}`}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
		>
			{option.icon}
			<span className="text">{option.title}</span>
		</li>
	);
}

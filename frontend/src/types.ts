import { ListNodeTagType } from "@lexical/list/LexicalListNode";
import { HeadingTagType } from "@lexical/rich-text";

export type EditorBlockTypes =
	| HeadingTagType
	| ListNodeTagType
	| undefined
	| string;

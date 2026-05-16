import { $convertFromMarkdownString } from '@lexical/markdown';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from 'lexical';
import { CUSTOM_TRANSFORMERS } from '../transformers';
import { preloadLanguageExtensions } from '../../code/language-extensions';
import { allLanguagesSet, type Languages } from '../../../types';

// Matches the syntax handled by the inline / block transformers in
// CUSTOM_TRANSFORMERS (bold, italic, inline code, strikethrough, links,
// headings, lists, blockquotes, horizontal rules, fenced code).
const MARKDOWN_SYNTAX_REGEX =
  /(\*\*|__|~~|`|\[[^\]]*\]\([^)]+\))|(^\s{0,3}(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|---\s*$|```))/m;

function hasMarkdownSyntax(text: string): boolean {
  return MARKDOWN_SYNTAX_REGEX.test(text);
}

// Tags that carry semantic formatting we couldn't reconstruct from plain-text
// markdown alone. If a clipboard's text/html payload contains any of these,
// the source is a real rich-text document and we should let Lexical's HTML
// path handle it instead of reinterpreting the text/plain version as
// markdown.
const RICH_HTML_TAG_REGEX =
  /<(?:strong|b|em|i|u|code|h[1-6]|ul|ol|li|blockquote|a\b|img|table|pre|del|s|mark|hr)\b/i;

function hasRichHtml(html: string): boolean {
  return RICH_HTML_TAG_REGEX.test(html);
}

// Pulls every language identifier from fenced code blocks in the markdown
// source, filtered to ones we actually have a CodeMirror grammar for. Used to
// pre-warm the lazy `@codemirror/lang-*` modules before the converted
// CodeNodes mount — otherwise each CodeMirror reconfigures from "no language"
// to "with language" on its own timeline, and many simultaneous reconfigures
// race and crash with a `tags` undefined error from the language extension.
const CODE_FENCE_REGEX = /^```(\w{1,10})/gm;

function extractCodeLanguages(text: string): Languages[] {
  const langs = new Set<Languages>();
  for (const match of text.matchAll(CODE_FENCE_REGEX)) {
    const raw = match[1];
    if (raw && allLanguagesSet.has(raw as Languages)) {
      langs.add(raw as Languages);
    }
  }
  return Array.from(langs);
}

function insertMarkdownNodes(text: string, savedSelection: BaseSelection) {
  const root = $getRoot();

  // Scratch container: $convertFromMarkdownString writes block-level children
  // into the node we pass it. A paragraph isn't a valid block parent, but
  // Lexical doesn't enforce that at runtime, so it works as a throwaway
  // holder while we extract the converted nodes.
  const scratch = $createParagraphNode();
  root.append(scratch);

  try {
    $convertFromMarkdownString(text, CUSTOM_TRANSFORMERS, scratch, true);
  } catch {
    scratch.remove();
    return;
  }

  const blocks = scratch.getChildren();
  if (blocks.length === 0) {
    scratch.remove();
    return;
  }

  // Common case: a single paragraph of inline markdown like `**abc**`.
  // Splice its inline children into the cursor position rather than inserting
  // a whole new paragraph (which would break the current line).
  const nodesToInsert =
    blocks.length === 1 && $isParagraphNode(blocks[0])
      ? blocks[0].getChildren()
      : blocks;

  for (const node of nodesToInsert) {
    node.remove();
  }
  scratch.remove();

  $setSelection(savedSelection);
  const restored = $getSelection();
  if ($isRangeSelection(restored)) {
    restored.insertNodes(nodesToInsert);
  }
}

/**
 * Handles pasting plain-text markdown by converting it to formatted Lexical
 * nodes. Returns true if the paste was handled (and the event should be
 * consumed), false otherwise.
 *
 * This complements `registerMarkdownShortcuts`, which only fires on
 * keystrokes and therefore never sees pasted text.
 */
export function handleMarkdownPaste(
  event: ClipboardEvent,
  editor: LexicalEditor
): boolean {
  const clipboard = event.clipboardData;
  if (!clipboard) return false;

  const text = clipboard.getData('text/plain');
  if (!text || !hasMarkdownSyntax(text)) return false;

  // Many apps (terminals, code editors, Slack) populate both text/plain and a
  // trivial text/html wrapper. Only defer to Lexical's HTML paste path when
  // the HTML carries real semantic formatting we'd lose by reinterpreting the
  // plain-text form as markdown.
  const html = clipboard.getData('text/html');
  if (html && hasRichHtml(html)) return false;

  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  event.preventDefault();
  event.stopPropagation();

  const savedSelection = selection.clone();
  const codeLanguages = extractCodeLanguages(text);

  if (codeLanguages.length === 0) {
    insertMarkdownNodes(text, savedSelection);
    return true;
  }

  // Defer the conversion until every grammar is resolved. By the time the
  // CodeNodes mount, `getLoadedLanguageExtension` returns synchronously and
  // CodeMirror starts with its language already configured — sidestepping the
  // reconfigure race that crashes when many code blocks mount at once.
  void preloadLanguageExtensions(codeLanguages).then(() => {
    editor.update(() => {
      insertMarkdownNodes(text, savedSelection);
    });
  });

  return true;
}

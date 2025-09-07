import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Events } from '@wailsio/runtime';
import {
  COMMAND_PRIORITY_EDITOR,
  type LexicalCommand,
  createCommand,
} from 'lexical';
import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { useAtom } from 'jotai';
import { SetNoteMarkdown } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { WINDOW_ID } from '../../../App';
import { CUSTOM_TRANSFORMERS } from '../transformers';
import {
  $convertToMarkdownStringCorrect,
  replaceFrontMatter,
  parseFrontMatter,
} from '../utils/note-metadata';
import { previousMarkdownAtom } from '../atoms';

type SaveMarkdownContentPayload =
  | undefined
  | {
      shouldSkipNoteChangedEmit: boolean;
      newFrontmatter?: Record<string, string>;
    };

export const SAVE_MARKDOWN_CONTENT: LexicalCommand<SaveMarkdownContentPayload> =
  createCommand('SAVE_MARKDOWN_CONTENT');

export function SavePlugin({
  folder,
  note,
  setFrontmatter,
  setNoteMarkdownString,
}: {
  folder: string;
  note: string;
  setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
  setNoteMarkdownString: Dispatch<SetStateAction<string | null>>;
}) {
  const [previousMarkdownWithFrontmatter, setPreviousMarkdownWithFrontmatter] =
    useAtom(previousMarkdownAtom);
  const [editor] = useLexicalComposerContext();
  const queryClient = useQueryClient();

  async function saveMarkdownContent(markdownWithFrontmatter: string) {
    const decodedFolder = decodeURIComponent(folder);
    const decodedNote = decodeURIComponent(note);
    await SetNoteMarkdown(decodedFolder, decodedNote, markdownWithFrontmatter);
    await queryClient.invalidateQueries({
      queryKey: ['note-preview', decodedFolder, decodedNote],
    });
  }
  // Register a command to save markdown content
  // This effect runs once when the component mounts and sets up the command
  // The command converts the editor content to markdown, updates frontmatter,
  // emits a 'note:changed' event, updates state, and saves the note to the backend
  useEffect(() => {
    // previousMarkdownWithFrontmatter.current = frontmatter.markdown;
    return mergeRegister(
      editor.registerCommand<SaveMarkdownContentPayload>(
        SAVE_MARKDOWN_CONTENT,
        (payload) => {
          const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);

          let frontmatterCopy = payload?.newFrontmatter;
          if (!frontmatterCopy) {
            const { frontMatter: existingFrontmatter } = parseFrontMatter(
              previousMarkdownWithFrontmatter
            );
            frontmatterCopy = {
              ...existingFrontmatter,
            };
          }
          const timeOfChange = new Date().toISOString();
          frontmatterCopy.folder = folder;
          frontmatterCopy.note = note;
          frontmatterCopy.lastUpdated = timeOfChange;
          if (!frontmatterCopy.createdDate) {
            frontmatterCopy.createdDate = timeOfChange;
          }

          const markdownWithFrontmatter = replaceFrontMatter(
            markdown,
            frontmatterCopy
          );

          if (!payload?.shouldSkipNoteChangedEmit) {
            // To prevent infinite loops when there are multiple windows open
            Events.Emit({
              name: 'note:changed',
              data: {
                folder,
                note,
                markdown: markdownWithFrontmatter,
                oldWindowAppId: WINDOW_ID,
              },
            });
          }

          setFrontmatter(frontmatterCopy);
          setNoteMarkdownString(markdownWithFrontmatter);
          saveMarkdownContent(markdownWithFrontmatter);
          setPreviousMarkdownWithFrontmatter(markdownWithFrontmatter);

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  }, [
    editor,
    folder,
    note,
    setFrontmatter,
    CUSTOM_TRANSFORMERS,
    previousMarkdownWithFrontmatter,
  ]);

  return null;
}

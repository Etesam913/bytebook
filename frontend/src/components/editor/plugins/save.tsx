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
import { replaceFrontMatter, parseFrontMatter } from '../utils/note-metadata';
import { previousMarkdownAtom } from '../atoms';
import { FilePath } from '../../../utils/string-formatting';
import { Frontmatter } from '../../../types';
import { $convertToMarkdownString } from '@lexical/markdown';

type SaveMarkdownContentPayload =
  | undefined
  | {
      shouldSkipNoteChangedEmit: boolean;
      newFrontmatter?: Frontmatter;
    };

export const SAVE_MARKDOWN_CONTENT: LexicalCommand<SaveMarkdownContentPayload> =
  createCommand('SAVE_MARKDOWN_CONTENT');

export function SavePlugin({
  filePath,
  setFrontmatter,
  setNoteMarkdownString,
}: {
  filePath: FilePath;
  setFrontmatter: Dispatch<SetStateAction<Frontmatter>>;
  setNoteMarkdownString: Dispatch<SetStateAction<string | null>>;
}) {
  const [previousMarkdownWithFrontmatter, setPreviousMarkdownWithFrontmatter] =
    useAtom(previousMarkdownAtom);
  const [editor] = useLexicalComposerContext();
  const queryClient = useQueryClient();

  async function saveMarkdownContent(markdownWithFrontmatter: string) {
    const decodedFolder = filePath.folder;
    const decodedNote = filePath.noteWithoutExtension;
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
    return mergeRegister(
      editor.registerCommand<SaveMarkdownContentPayload>(
        SAVE_MARKDOWN_CONTENT,
        (payload) => {
          const markdown = $convertToMarkdownString(
            CUSTOM_TRANSFORMERS,
            undefined,
            true
          );

          let frontmatterCopy = payload?.newFrontmatter;
          if (!frontmatterCopy) {
            const { frontMatter: existingFrontmatter } = parseFrontMatter(
              previousMarkdownWithFrontmatter
            );
            frontmatterCopy = {
              ...existingFrontmatter,
            };
          }
          const tags: string[] | undefined = queryClient.getQueryData([
            'notes-tags',
            filePath.toString(),
          ]);
          const timeOfChange = new Date().toISOString();
          frontmatterCopy.folder = filePath.folder;
          frontmatterCopy.note = filePath.noteWithoutExtension;
          frontmatterCopy.lastUpdated = timeOfChange;
          if (!frontmatterCopy.createdDate) {
            frontmatterCopy.createdDate = timeOfChange;
          }
          if (tags && tags.length > 0) {
            frontmatterCopy.tags = tags;
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
                folder: filePath.folder,
                note: filePath.noteWithoutExtension,
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
    filePath,
    setFrontmatter,
    CUSTOM_TRANSFORMERS,
    previousMarkdownWithFrontmatter,
  ]);

  return null;
}

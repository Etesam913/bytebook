import { RefObject, useState } from 'react';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';
import { Duplicate2 } from '../../icons/duplicate-2';
import { Maximize } from '../../icons/maximize';
import { Minimize } from '../../icons/minimize';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { SquareTerminal } from '../../icons/square-terminal';
import { Subtitles } from '../../icons/subtitles';
import { DropdownMenu } from '../dropdown/dropdown-menu';
import { Tooltip } from '../tooltip';
import type { CodeMirrorRef } from './types';
import { languagesWithKernelsSet, type Languages } from '../../types';
import { routeUrls } from '../../utils/routes';
import { navigate } from 'wouter/use-browser-location';
import { Trash } from '../../icons/trash';
import { removeDecoratorNode } from '../../utils/commands';
import type { LexicalEditor } from 'lexical';
import { cn } from '../../utils/string-formatting';

export function CodeActions({
  editor,
  codeMirrorInstance,
  isExpanded,
  setIsExpanded,
  hideResults,
  setHideResults,
  language,
  nodeKey,
  dialogRef,
}: {
  editor: LexicalEditor;
  codeMirrorInstance: CodeMirrorRef;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  hideResults: boolean;
  setHideResults: (value: boolean) => void;
  language: Languages;
  nodeKey: string;
  dialogRef?: RefObject<HTMLDialogElement | null>;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const canShowKernelInfo =
    language !== 'text' &&
    languagesWithKernelsSet.has(language as Exclude<Languages, 'text'>);

  const tooltipRoot = isExpanded && dialogRef ? dialogRef : undefined;

  return (
    <div
      className={cn(
        'absolute flex gap-1 -top-5 right-2.5 z-10 p-1 border border-zinc-200 dark:border-zinc-600 rounded-md shadow-lg cm-background',
        isExpanded && 'top-2 right-4'
      )}
    >
      {hideResults && (
        <Tooltip content="Delete" placement="bottom" root={tooltipRoot}>
          <MotionIconButton
            onClick={() => {
              editor.update(() => {
                removeDecoratorNode(nodeKey);
              });
            }}
          >
            <Trash className="will-change-transform" height={19} width={19} />
          </MotionIconButton>
        </Tooltip>
      )}
      <Tooltip
        content={isExpanded ? 'Minimize' : 'Maximize'}
        placement="top"
        root={tooltipRoot}
      >
        <MotionIconButton
          {...getDefaultButtonVariants({
            disabled: false,
            whileHover: 1.05,
            whileTap: 0.975,
            whileFocus: 1.05,
          })}
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <Minimize /> : <Maximize />}
        </MotionIconButton>
      </Tooltip>
      <DropdownMenu
        items={[
          {
            value: 'copy-code',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <Duplicate2 height={18} width={18} /> Copy Code
              </span>
            ),
          },
          ...(canShowKernelInfo
            ? [
                {
                  value: 'kernel-info',
                  label: (
                    <span className="flex items-center gap-1.5 will-change-transform">
                      <SquareTerminal height={18} width={18} /> Kernel Info
                    </span>
                  ),
                },
              ]
            : []),
          {
            value: hideResults ? 'show-results' : 'hide-results',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <Subtitles height="18" width="18" />
                {hideResults ? 'Show Results' : 'Hide Results'}
              </span>
            ),
          },
        ]}
        isOpen={isDropdownOpen}
        setIsOpen={setIsDropdownOpen}
        dropdownClassName="w-48 right-0 top-10"
        onChange={async (item) => {
          setIsDropdownOpen(false);
          switch (item.value) {
            case 'copy-code': {
              if (!codeMirrorInstance?.view) break;
              const editorContent =
                codeMirrorInstance.view.state.doc.toString();
              if (!editorContent) break;
              await navigator.clipboard.writeText(editorContent);
              break;
            }
            case 'kernel-info': {
              if (!canShowKernelInfo) break;
              navigate(routeUrls.kernel(language));
              break;
            }
            case 'hide-results': {
              setHideResults(true);
              break;
            }
            case 'show-results': {
              setHideResults(false);
              break;
            }
          }
        }}
      >
        {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
          <Tooltip
            content="Code settings"
            placement={isExpanded ? 'bottom' : 'top'}
            root={tooltipRoot}
          >
            <MotionIconButton
              id={buttonId}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuId : undefined}
              aria-label="Code block settings menu"
              {...getDefaultButtonVariants({
                disabled: false,
                whileHover: 1.05,
                whileTap: 0.975,
                whileFocus: 1.05,
              })}
            >
              <HorizontalDots height={18} width={18} />
            </MotionIconButton>
          </Tooltip>
        )}
      </DropdownMenu>
    </div>
  );
}

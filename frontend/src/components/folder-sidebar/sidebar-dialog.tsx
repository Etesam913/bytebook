import { type Dispatch, ReactNode, type SetStateAction, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import {
  AddFolder,
  DeleteFolder,
  RenameFolder,
} from "../../../bindings/main/FolderService";
import { FolderPen } from "../../icons/folder-pen.tsx";
import { FolderPlus } from "../../icons/folder-plus";
import { FolderXMark } from "../../icons/folder-xmark.tsx";
import { FolderDialogAction, FolderDialogState } from "../../types.ts";
import { fileNameRegex } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { MotionButton } from "../buttons";
import { Dialog, ErrorText } from "../dialog";
import { updateMostRecentNotesOnFolderDelete } from "../../utils/misc.ts";
import { mostRecentNotesAtom } from "../../atoms.ts";
import { useAtom } from "jotai";

const actionNameMap: Record<
  FolderDialogAction,
  { title: string; icon: ReactNode }
> = {
  create: { title: "Create Folder", icon: <FolderPlus /> },
  rename: { title: "Rename Folder", icon: <FolderPen /> },
  delete: { title: "Delete Folder", icon: <FolderXMark /> },
};

export function FolderSidebarDialog({
  isFolderDialogOpen,
  setIsFolderDialogOpen,
  setFolders,
  folders,
}: {
  isFolderDialogOpen: FolderDialogState;
  setIsFolderDialogOpen: Dispatch<SetStateAction<FolderDialogState>>;
  setFolders: Dispatch<SetStateAction<string[] | null>>;
  folders: string[];
}) {
  const [errorText, setErrorText] = useState("");
  const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);
  const { action, isOpen } = isFolderDialogOpen;
  return (
    <Dialog
      handleSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement);
        const folderNameValue = formData.get("folder-name");
        if (folderNameValue && typeof folderNameValue === "string") {
          const folderName = folderNameValue.trim() satisfies string;
          if (!fileNameRegex.test(folderName)) {
            setErrorText(
              "Invalid folder name. Folder names can only contain letters, numbers, spaces, hyphens, and underscores.",
            );
            return;
          }

          if (action === "create") {
            AddFolder(folderName)
              .then((res) => {
                if (res.success) {
                  setIsFolderDialogOpen({ isOpen: false, folderName });
                  setErrorText("");
                  setFolders((prev) =>
                    prev ? [...prev, folderName] : [folderName],
                  );
                  navigate(`/${folderName}`);
                } else {
                  setErrorText(res.message);
                }
              })
              .catch((e) => {
                console.error(e);
                setErrorText(e.message);
              });
          } else if (action === "rename") {
            RenameFolder(isFolderDialogOpen.folderName, folderName)
              .then((res) => {
                if (res.success) {
                  setIsFolderDialogOpen({ isOpen: false, folderName: "" });
                  setErrorText("");
                  setFolders((prev) => {
                    return prev
                      ? prev.map(
                          (v: string) =>
                            v === isFolderDialogOpen.folderName
                              ? folderName
                              : v,
                          // eslint-disable-next-line no-mixed-spaces-and-tabs
                        )
                      : [folderName];
                  });
                  navigate(`/${folderName}`);
                }
              })
              .catch((e) => {
                console.error(e);
                if (e.message) {
                  setErrorText(e.message);
                }
              });
          }
        } else if (action === "delete") {
          DeleteFolder(`${isFolderDialogOpen.folderName}`).then((res) => {
            if (res.success) {
              const newFolders = folders.filter(
                (v) => v !== isFolderDialogOpen.folderName,
              );
              navigate(folders.length > 1 ? `/${newFolders[0]}` : "/");
              setFolders(newFolders);
              setIsFolderDialogOpen({ isOpen: false, folderName: "" });
              updateMostRecentNotesOnFolderDelete(
                isFolderDialogOpen.folderName,
                mostRecentNotes,
                setMostRecentNotes,
              );
            }
          });
        }
      }}
      title={actionNameMap[action ?? "create"].title}
      isOpen={isOpen}
      setIsOpen={(isOpen) => {
        setIsFolderDialogOpen({ isOpen: isOpen, folderName: "" });
      }}
    >
      <div className="flex flex-col">
        {action !== "delete" ? (
          <>
            <label className="cursor-pointer pb-2" htmlFor="folder-name">
              New Folder Name
            </label>
            <input
              data-testid="folder_name"
              name="folder-name"
              placeholder="My To Do's"
              className="w-full rounded-sm border-[1px] border-zinc-300 px-2 py-1 transition-colors focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:focus:border-zinc-500"
              id="folder-name"
              type="text"
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to{" "}
            <span className="text-red-500">delete</span> "
            {isFolderDialogOpen.folderName}" and sent its notes to the trash
            bin?
          </p>
        )}

        <section className="mt-4 flex w-full flex-col gap-1 px-[0.5rem] ">
          <ErrorText errorText={errorText} />
          <MotionButton
            type="submit"
            {...getDefaultButtonVariants()}
            className="flex w-full flex-wrap items-center justify-center gap-2 text-center "
          >
            {actionNameMap[action ?? "create"].title}{" "}
            {actionNameMap[action ?? "create"].icon}
          </MotionButton>
        </section>
      </div>
    </Dialog>
  );
}

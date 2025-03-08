import { useMutation } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai/react';
import { toast } from 'sonner';
import { SyncChangesWithRepo } from '../../../bindings/github.com/etesam913/bytebook/services/nodeservice';
import {
  dialogDataAtom,
  projectSettingsAtom,
  userDataAtomWithLocalStorage,
} from '../../atoms';
import { FileRefresh } from '../../icons/file-refresh';
import { DEFAULT_SONNER_OPTIONS } from '../../utils/general';
import { SyncChangesDialog } from '../sync-changes-dialog';

export function SyncChangesButton() {
  const userData = useAtomValue(userDataAtomWithLocalStorage);
  const setDialogData = useSetAtom(dialogDataAtom);
  const { repositoryToSyncTo } = useAtomValue(projectSettingsAtom);
  const { mutateAsync: syncChangesWithRepo, isPending } = useMutation({
    mutationFn: async ({
      login,
      accessToken,
      commitMessage,
    }: {
      login: string;
      accessToken: string;
      commitMessage: string;
    }) => {
      const res = await SyncChangesWithRepo(
        login,
        accessToken,
        repositoryToSyncTo,
        commitMessage
      );
      if (!res.success) throw new Error(res.message);
      return res.message;
    },
    onSuccess: (message) => {
      toast.success(message, DEFAULT_SONNER_OPTIONS);
    },
  });
  return (
    <button
      type="button"
      disabled={isPending}
      className="flex gap-1 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 p-1 rounded-md transition-colors"
      onClick={() => {
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Sync Changes',
          dialogClassName: 'w-[min(30rem,90vw)]',
          children: (errorText, isPending) => (
            <SyncChangesDialog errorText={errorText} isPending={isPending} />
          ),
          onSubmit: async (e, setErrorText) => {
            try {
              const formData = new FormData(e.target as HTMLFormElement);
              const commitMessage = formData.get('commit-message');
              if (
                !commitMessage ||
                typeof commitMessage !== 'string' ||
                commitMessage.trim().length === 0
              )
                throw new Error('Commit message cannot be empty');
              if (userData?.login === null || userData?.accessToken === null) {
                throw new Error('You must be logged in to sync changes');
              }
              const commitMessageString = commitMessage.toString().trim();
              const resMessage = await syncChangesWithRepo({
                login: userData?.login ?? '',
                accessToken: userData?.accessToken ?? '',
                commitMessage: commitMessageString,
              });
              const didSucceed =
                resMessage !== null && resMessage !== undefined;
              return didSucceed;
            } catch (e) {
              if (e instanceof Error) setErrorText(e.message);
              return false;
            }
          },
        });
      }}
    >
      <FileRefresh /> Sync Changes
    </button>
  );
}

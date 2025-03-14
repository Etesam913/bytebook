import { useSetAtom } from 'jotai';
import { Languages } from '../components/editor/nodes/code';
import { useWailsEvent } from './events';
import { goKernelStatusAtom, pythonKernelStatusAtom } from '../atoms';
import { KernelStatus } from '../types';

export function useKernelStatus() {
  const setPythonKernelStatus = useSetAtom(pythonKernelStatusAtom);
  const setGoKernelStatus = useSetAtom(goKernelStatusAtom);
  useWailsEvent('code:kernel:status', (body) => {
    console.info('code:kernel:status');
    const data = body.data as {
      status: KernelStatus;
      language: Languages;
    }[];
    if (data.length === 0) return;
    if (data[0].language === 'python') {
      setPythonKernelStatus(data[0].status);
    } else if (data[0].language === 'go') {
      setGoKernelStatus(data[0].status);
    }
  });
}

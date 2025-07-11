import { useAtomValue } from 'jotai/react';
import { useParams } from 'wouter';
import { kernelsDataAtom } from '../../atoms';
import { PythonLogo } from '../../icons/python-logo';
import { GolangLogo } from '../../icons/golang-logo';
import { SquareTerminal } from '../../icons/square-terminal';
import { ReactNode } from 'react';
import { KernelStatusCard } from './kernel-status-card';
import { KernelInfoCard } from './kernel-info-card';
import { KernelErrorCard } from './kernel-error-card';
import { Languages } from '../../types';

interface KernelConfig {
  displayName: string;
  executable: string;
  icon: ReactNode;
}

const KERNEL_CONFIGS: Record<string, KernelConfig> = {
  python: {
    displayName: 'Python',
    executable: 'python',
    icon: <PythonLogo height={32} width={32} />,
  },
  go: {
    displayName: 'Go',
    executable: 'go',
    icon: <GolangLogo height={32} width={32} />,
  },
  // Future kernels can be added here:
  // javascript: {
  //   displayName: 'JavaScript',
  //   executable: 'node',
  //   icon: <JavaScriptLogo height={32} width={32} />,
  // },
  // rust: {
  //   displayName: 'Rust',
  //   executable: 'rust',
  //   icon: <RustLogo height={32} width={32} />,
  // }
};

export function KernelInfo() {
  const { kernelName } = useParams<{ kernelName: string }>();
  const kernelsData = useAtomValue(kernelsDataAtom);

  // Get supported kernels from both config and atom data
  const supportedKernels = Object.keys(KERNEL_CONFIGS);
  const availableKernels = Object.keys(kernelsData);

  // Kernel must be both configured and available in kernelsData
  const isValidKernel =
    kernelName &&
    supportedKernels.includes(kernelName) &&
    availableKernels.includes(kernelName);

  if (!isValidKernel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <SquareTerminal
            width={48}
            height={48}
            className="mx-auto mb-4 text-zinc-400"
          />
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Kernel Not Found
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            The requested kernel "{kernelName}" is not available.
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
            Supported kernels: {supportedKernels.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  const kernelData = kernelsData[kernelName];
  const kernelConfig = KERNEL_CONFIGS[kernelName];

  const getKernelIcon = (kernel: string) => {
    return (
      KERNEL_CONFIGS[kernel]?.icon || <SquareTerminal height={32} width={32} />
    );
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {getKernelIcon(kernelName)}
          <div>
            <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 capitalize">
              {kernelConfig.displayName} Kernel
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Kernel information and status
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div className="mb-8">
          <KernelStatusCard
            status={kernelData.status}
            heartbeat={kernelData.heartbeat}
          />
        </div>

        {/* Error Message Section */}
        {kernelData.errorMessage && (
          <KernelErrorCard errorMessage={kernelData.errorMessage} />
        )}

        {/* Kernel Info Section */}
        <KernelInfoCard language={kernelName as Languages} />
      </div>
    </div>
  );
}

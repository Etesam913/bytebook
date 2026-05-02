import { useAtomValue } from 'jotai/react';
import { useParams } from 'wouter';
import { kernelInstancesByLanguageAtom } from '../../atoms';
import { PythonLogo } from '../../icons/python-logo';
import { GolangLogo } from '../../icons/golang-logo';
import { SquareTerminal } from '../../icons/square-terminal';
import { ReactNode } from 'react';
import { KernelStatusCard } from './kernel-status-card';
import { KernelInfoCard } from './kernel-info-card';
import { KernelErrorCard } from './kernel-error-card';
import { KernelQuickstart } from './kernel-quickstart';
import type { LanguagesWithKernels } from '../../types';
import { isValidKernelLanguage } from '../../types';
import { JavascriptLogo } from '../../icons/javascript-logo';
import { JavaLogo } from '../../icons/java-logo';

interface KernelConfig {
  displayName: string;
  executable: string;
  icon: ReactNode;
}

const KERNEL_CONFIGS: Record<LanguagesWithKernels, KernelConfig> = {
  python: {
    displayName: 'Python',
    executable: 'python',
    icon: <PythonLogo height="2rem" width="2rem" />,
  },
  go: {
    displayName: 'Go',
    executable: 'go',
    icon: <GolangLogo height="2rem" width="2rem" />,
  },
  javascript: {
    displayName: 'Javascript',
    executable: 'deno',
    icon: <JavascriptLogo height="2rem" width="2rem" />,
  },
  java: {
    displayName: 'Java',
    executable: 'java',
    icon: <JavaLogo height="2rem" width="2rem" />,
  },
};

export function KernelInfo() {
  const { kernelName } = useParams<{ kernelName: string }>();
  const byLanguage = useAtomValue(kernelInstancesByLanguageAtom);

  const isValidKernel =
    kernelName &&
    isValidKernelLanguage(kernelName) &&
    kernelName !== 'text' &&
    kernelName in KERNEL_CONFIGS;

  if (!isValidKernel) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-center min-h-full">
          <div className="text-center">
            <SquareTerminal
              width="3rem"
              height="3rem"
              className="mx-auto mb-4 text-zinc-400"
            />
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Kernel Not Found
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              The requested kernel &quot;{kernelName}&quot; is not available.
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
              Supported kernels: {Object.keys(KERNEL_CONFIGS).join(', ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const language = kernelName as LanguagesWithKernels;
  const kernelConfig = KERNEL_CONFIGS[language];
  const instances = byLanguage[language] ?? [];
  const errorInstances = instances.filter((i) => i.errorMessage);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col p-6 w-full max-w-220 mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {kernelConfig.icon}
          <div>
            <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 capitalize">
              {kernelConfig.displayName} Kernel
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {instances.length} active instance
              {instances.length === 1 ? '' : 's'} (max 3 per language)
            </p>
          </div>
        </div>

        {instances.length === 0 ? (
          <div className="bg-white dark:bg-zinc-750 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700 mb-8 text-zinc-500 dark:text-zinc-400">
            {`No ${kernelConfig.displayName} kernels are running. A kernel is launched the first time you execute a code block in a note.`}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-8">
            {instances.map((instance) => (
              <KernelStatusCard key={instance.id} instance={instance} />
            ))}
          </div>
        )}

        {errorInstances.map((instance) => (
          <KernelErrorCard
            key={`err-${instance.id}`}
            errorMessage={instance.errorMessage ?? ''}
          />
        ))}

        <KernelInfoCard language={language} />

        <div className="mt-8">
          <KernelQuickstart language={language} />
        </div>
      </div>
    </div>
  );
}

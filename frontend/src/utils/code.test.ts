import { describe, it, expect, vi } from 'vitest';
import {
  getDefaultCodeForLanguage,
  runCode,
  handleRunOrInterruptCode,
} from './code';
import type { CodeMirrorRef } from '../components/code/types';
import type { KernelsData, Languages } from '../types';

const createCodeMirrorStub = (
  code: string | null | undefined
): CodeMirrorRef =>
  ({
    view: {
      state: {
        doc: {
          toString: () => code as string,
        },
      },
    },
  }) as unknown as CodeMirrorRef;

const createKernelsData = (
  overrides: Partial<Record<keyof KernelsData, Partial<KernelsData[keyof KernelsData]>>> = {}
): KernelsData => ({
  python: { status: 'idle', heartbeat: 'success', errorMessage: null, ...overrides.python },
  go: { status: 'idle', heartbeat: 'success', errorMessage: null, ...overrides.go },
  javascript: { status: 'idle', heartbeat: 'success', errorMessage: null, ...overrides.javascript },
  java: { status: 'idle', heartbeat: 'success', errorMessage: null, ...overrides.java },
});

describe('getDefaultCodeForLanguage', () => {
  it('returns the expected template for each supported language', () => {
    const cases: Array<[Languages, string]> = [
      ['python', 'print("Hello, World!")\n\n\n\n'],
      ['go', '%% \nfmt.Println("Hello, World!")\n\n\n\n'],
      ['javascript', 'console.log("Hello, World!");\n\n\n\n'],
      ['java', 'System.out.println("Hello, World!");\n\n\n\n'],
      ['text', ''],
    ];

    cases.forEach(([language, template]) => {
      expect(getDefaultCodeForLanguage(language)).toBe(template);
    });
  });
});

describe('runCode', () => {
  it('executes the editor contents with a generated execution id', () => {
    const executeCode = vi.fn();
    const editor = createCodeMirrorStub('print("ok")');

    runCode(editor, executeCode);

    expect(executeCode).toHaveBeenCalledWith({
      code: 'print("ok")',
      newExecutionId: expect.any(String),
    });
  });

  it('does nothing when the editor cannot provide code', () => {
    const executeCode = vi.fn();
    const editor = createCodeMirrorStub(undefined);

    runCode(editor, executeCode);

    expect(executeCode).not.toHaveBeenCalled();
  });
});

describe('handleRunOrInterruptCode', () => {
  const codeBlockId = 'block-123';
  const language: Languages = 'python';

  it('restarts the kernel when its heartbeat indicates a failure', () => {
    const interruptExecution = vi.fn();
    const executeCode = vi.fn();
    const turnOnKernel = vi.fn();
    const kernelsData = createKernelsData({
      python: { heartbeat: 'failure' },
    });

    const result = handleRunOrInterruptCode({
      status: 'idle',
      codeBlockId,
      codeBlockLanguage: language,
      interruptExecution,
      codeMirrorInstance: createCodeMirrorStub('print("x")'),
      executeCode,
      kernelsData,
      turnOnKernel,
    });

    expect(result).toBe(true);
    expect(turnOnKernel).toHaveBeenCalledWith(language);
    expect(interruptExecution).not.toHaveBeenCalled();
    expect(executeCode).not.toHaveBeenCalled();
  });

  it('interrupts a busy block instead of re-running it', () => {
    const interruptExecution = vi.fn();
    const executeCode = vi.fn();
    const turnOnKernel = vi.fn();
    const kernelsData = createKernelsData();

    const result = handleRunOrInterruptCode({
      status: 'busy',
      codeBlockId,
      codeBlockLanguage: language,
      interruptExecution,
      codeMirrorInstance: createCodeMirrorStub('print("x")'),
      executeCode,
      kernelsData,
      turnOnKernel,
    });

    expect(result).toBe(true);
    expect(interruptExecution).toHaveBeenCalledWith({
      codeBlockId,
      codeBlockLanguage: language,
      newExecutionId: '',
    });
    expect(executeCode).not.toHaveBeenCalled();
    expect(turnOnKernel).not.toHaveBeenCalled();
  });

  it('runs the code when the kernel is healthy and idle', () => {
    const interruptExecution = vi.fn();
    const executeCode = vi.fn();
    const turnOnKernel = vi.fn();
    const kernelsData = createKernelsData();
    const editor = createCodeMirrorStub('console.log("ready")');

    const result = handleRunOrInterruptCode({
      status: 'idle',
      codeBlockId,
      codeBlockLanguage: language,
      interruptExecution,
      codeMirrorInstance: editor,
      executeCode,
      kernelsData,
      turnOnKernel,
    });

    expect(result).toBe(true);
    expect(executeCode).toHaveBeenCalledWith({
      code: 'console.log("ready")',
      newExecutionId: expect.any(String),
    });
    expect(interruptExecution).not.toHaveBeenCalled();
    expect(turnOnKernel).not.toHaveBeenCalled();
  });
});

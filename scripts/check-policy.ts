interface CheckOutcome {
  exitCode: number | null;
  stdout: string;
  failOnStdout?: boolean;
}

export function checkSucceeded({
  exitCode,
  stdout,
  failOnStdout = false,
}: CheckOutcome): boolean {
  return exitCode === 0 && !(failOnStdout && stdout.trim().length > 0);
}

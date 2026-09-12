import { describe, expect, test } from "bun:test";
import { checkSucceeded } from "./check-policy";

describe("checkSucceeded", () => {
  test("fails analyzer tasks that report findings with a zero exit code", () => {
    const success = checkSucceeded({
      exitCode: 0,
      stdout: "example.go:10:1: unreachable func: unused\n",
      failOnStdout: true,
    });

    expect(success).toBe(false);
  });

  test("passes analyzer tasks with no findings", () => {
    const success = checkSucceeded({
      exitCode: 0,
      stdout: "\n",
      failOnStdout: true,
    });

    expect(success).toBe(true);
  });

  test("allows output from ordinary successful tasks", () => {
    const success = checkSucceeded({
      exitCode: 0,
      stdout: "tests passed\n",
    });

    expect(success).toBe(true);
  });
});

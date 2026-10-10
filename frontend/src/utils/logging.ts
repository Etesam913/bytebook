/**
 * Custom log level styles for browser console
 */
const LOG_STYLES = {
  EVENT:
    'color: #a855f7; font-weight: bold; background: #faf5ff; padding: 2px 6px; border-radius: 3px;',
  STATE:
    'color: #14b8a6; font-weight: bold; background: #f0fdfa; padding: 2px 6px; border-radius: 3px;',
} as const;

type LogLevel = keyof typeof LOG_STYLES;

/**
 * Logs a message with styled output.
 * Objects are logged separately to allow browser's native expansion.
 */
function logWithStyle(level: LogLevel, message: string, args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  const style = LOG_STYLES[level];
  console.log(`%c ${level} %c ${message}`, style, 'color: inherit;', ...args);
}

/**
 * Custom logger with styled console output and expandable objects.
 * Output is dev-only; calls are no-ops in production builds.
 */
class CustomLogger {
  /**
   * Log a message at the EVENT level with magenta styling.
   * Use this for logging Wails events and application events.
   */
  event(message: string, ...args: unknown[]): void {
    logWithStyle('EVENT', message, args);
  }

  /**
   * Log a message at the STATE level with teal styling.
   * Use this for logging state changes and transitions.
   */
  state(message: string, ...args: unknown[]): void {
    logWithStyle('STATE', message, args);
  }
}

/**
 * Global logger instance with styled output for browser console.
 */
export const logger = new CustomLogger();

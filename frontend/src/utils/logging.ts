/**
 * Custom log level styles for browser console
 */
const LOG_STYLES = {
  EVENT:
    'color: #a855f7; font-weight: bold; background: #faf5ff; padding: 2px 6px; border-radius: 3px;',
  STATE:
    'color: #14b8a6; font-weight: bold; background: #f0fdfa; padding: 2px 6px; border-radius: 3px;',
  INFO: 'color: #3b82f6; font-weight: bold; background: #eff6ff; padding: 2px 6px; border-radius: 3px;',
  DEBUG:
    'color: #22c55e; font-weight: bold; background: #f0fdf4; padding: 2px 6px; border-radius: 3px;',
  WARN: 'color: #eab308; font-weight: bold; background: #fefce8; padding: 2px 6px; border-radius: 3px;',
  ERROR:
    'color: #ef4444; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 3px;',
} as const;

type LogLevel = keyof typeof LOG_STYLES;

/**
 * Logs a message with styled output.
 * Objects are logged separately to allow browser's native expansion.
 */
function logWithStyle(level: LogLevel, message: string, args: unknown[]): void {
  const style = LOG_STYLES[level];
  console.log(`%c ${level} %c ${message}`, style, 'color: inherit;', ...args);
}

/**
 * Custom logger with styled console output and expandable objects.
 * Designed specifically for browser environments with pretty formatting.
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

  /**
   * Log a message at the INFO level with blue styling.
   */
  info(message: string, ...args: unknown[]): void {
    logWithStyle('INFO', message, args);
  }

  /**
   * Log a message at the DEBUG level with green styling.
   */
  debug(message: string, ...args: unknown[]): void {
    logWithStyle('DEBUG', message, args);
  }

  /**
   * Log a message at the WARN level with yellow styling.
   */
  warn(message: string, ...args: unknown[]): void {
    logWithStyle('WARN', message, args);
  }

  /**
   * Log a message at the ERROR level with red styling.
   */
  error(message: string, ...args: unknown[]): void {
    logWithStyle('ERROR', message, args);
  }
}

/**
 * Global logger instance with styled output for browser console.
 */
export const logger = new CustomLogger();

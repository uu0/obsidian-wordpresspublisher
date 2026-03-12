/**
 * Unified logging utility for the plugin
 * Provides structured logging with different levels and module context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  data?: any;
}

/**
 * Unified Logger class
 * Singleton pattern for consistent logging across the application
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set logging level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable console logging
   */
  setEnableConsole(enable: boolean): void {
    this.config.enableConsole = enable;
  }

  /**
   * Format log entry
   */
  private formatEntry(level: string, module: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(data !== undefined && { data })
    };
  }

  /**
   * Log debug message
   */
  debug(module: string, message: string, data?: any): void {
    if (this.config.level <= LogLevel.DEBUG && this.config.enableConsole) {
      const entry = this.formatEntry('DEBUG', module, message, data);
      console.debug(`[${entry.timestamp}] [${entry.module}] ${entry.message}`, data || '');
    }
  }

  /**
   * Log info message
   */
  info(module: string, message: string, data?: any): void {
    if (this.config.level <= LogLevel.INFO && this.config.enableConsole) {
      const entry = this.formatEntry('INFO', module, message, data);
      console.info(`[${entry.timestamp}] [${entry.module}] ${entry.message}`, data || '');
    }
  }

  /**
   * Log warning message
   */
  warn(module: string, message: string, data?: any): void {
    if (this.config.level <= LogLevel.WARN && this.config.enableConsole) {
      const entry = this.formatEntry('WARN', module, message, data);
      console.warn(`[${entry.timestamp}] [${entry.module}] ${entry.message}`, data || '');
    }
  }

  /**
   * Log error message
   */
  error(module: string, message: string, error?: Error | any): void {
    if (this.config.level <= LogLevel.ERROR && this.config.enableConsole) {
      const entry = this.formatEntry('ERROR', module, message, error);
      // Only log in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error(`[${entry.timestamp}] [${entry.module}] ${entry.message}`, error || '');
      }
    }
  }

  /**
   * Log with custom log level
   */
  log(level: LogLevel, module: string, message: string, data?: any): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(module, message, data);
        break;
      case LogLevel.INFO:
        this.info(module, message, data);
        break;
      case LogLevel.WARN:
        this.warn(module, message, data);
        break;
      case LogLevel.ERROR:
        this.error(module, message, data);
        break;
      default:
        break;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

/**
 * Create a module-specific logger
 */
export function createModuleLogger(moduleName: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(moduleName, message, data),
    info: (message: string, data?: any) => logger.info(moduleName, message, data),
    warn: (message: string, data?: any) => logger.warn(moduleName, message, data),
    error: (message: string, error?: any) => logger.error(moduleName, message, error)
  };
}

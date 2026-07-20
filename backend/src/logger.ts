/**
 * Structured logging utility
 *
 * Outputs JSON logs that can be easily ingested by Datadog, Sentry, ELK, CloudWatch, etc.
 * Format: { timestamp, level, message, userId, requestId, ...context }
 *
 * Environment Variables:
 * - LOG_LEVEL: debug, info, warn, error (default: info)
 * - LOG_FORMAT: json (default), or text for development
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;
  private logFormat: 'json' | 'text';

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.logFormat = (process.env.LOG_FORMAT as 'json' | 'text') || 'json';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, context: LogContext): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    if (this.logFormat === 'json') {
      return JSON.stringify(logEntry);
    } else {
      // Text format for development
      const contextStr = Object.keys(context).length
        ? ' ' + JSON.stringify(context)
        : '';
      return `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }
  }

  debug(message: string, context: LogContext = {}): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context: LogContext = {}): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context: LogContext = {}): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, context: LogContext = {}): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }
}

export const logger = new Logger();

/**
 * HTTP Request/Response logging context
 * Attach to Express request for tracking across middleware/handlers
 */
export interface RequestLoggingContext {
  requestId: string;
  userId?: string;
  email?: string;
  method: string;
  path: string;
  userAgent?: string;
}

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract userId/email from JWT token for logging
 */
export function extractUserInfo(
  user?: { userId: string; email: string; role: string }
): { userId?: string; email?: string } {
  if (!user) return {};
  return { userId: user.userId, email: user.email };
}

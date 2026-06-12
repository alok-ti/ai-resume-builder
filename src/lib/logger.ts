type LogLevel = 'info' | 'warn' | 'error' | 'db';

class StructuredLogger {
  private isDev = process.env.NODE_ENV === 'development';

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, tag: string, message: string): string {
    return `[${this.getTimestamp()}] [${level.toUpperCase()}] [${tag}] ${message}`;
  }

  public info(tag: string, message: string, data?: any) {
    const logStr = this.formatMessage('info', tag, message);
    if (this.isDev) {
      if (typeof window !== 'undefined') {
        console.log(`%c${logStr}`, 'color: #3b82f6; font-weight: bold', data !== undefined ? data : '');
      } else {
        console.log(`\x1b[34m${logStr}\x1b[0m`, data !== undefined ? JSON.stringify(data, null, 2) : '');
      }
    } else {
      console.log(logStr, data !== undefined ? JSON.stringify(data) : '');
    }
  }

  public warn(tag: string, message: string, data?: any) {
    const logStr = this.formatMessage('warn', tag, message);
    if (this.isDev) {
      if (typeof window !== 'undefined') {
        console.warn(`%c${logStr}`, 'color: #f59e0b; font-weight: bold', data !== undefined ? data : '');
      } else {
        console.log(`\x1b[33m${logStr}\x1b[0m`, data !== undefined ? JSON.stringify(data, null, 2) : '');
      }
    } else {
      console.warn(logStr, data !== undefined ? JSON.stringify(data) : '');
    }
  }

  public error(tag: string, message: string, error?: any) {
    const logStr = this.formatMessage('error', tag, message);
    if (this.isDev) {
      if (typeof window !== 'undefined') {
        console.error(`%c${logStr}`, 'color: #ef4444; font-weight: bold', error !== undefined ? error : '');
      } else {
        console.error(`\x1b[31m${logStr}\x1b[0m`, error !== undefined ? error : '');
      }
    } else {
      console.error(logStr, error !== undefined ? JSON.stringify(error) : '');
    }
  }

  public db(tag: string, message: string, queryInfo?: any) {
    const logStr = this.formatMessage('db', tag, message);
    if (this.isDev) {
      if (typeof window !== 'undefined') {
        console.log(`%c${logStr}`, 'color: #10b981; font-weight: bold', queryInfo !== undefined ? queryInfo : '');
      } else {
        console.log(`\x1b[32m${logStr}\x1b[0m`, queryInfo !== undefined ? JSON.stringify(queryInfo, null, 2) : '');
      }
    } else {
      console.log(logStr, queryInfo !== undefined ? JSON.stringify(queryInfo) : '');
    }
  }
}

export const logger = new StructuredLogger();

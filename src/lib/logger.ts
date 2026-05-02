/**
 * 统一结构化日志工具
 *
 * 所有 API 路由应使用此模块，而非各自内联 console.log。
 * 输出格式：JSON 结构化日志，便于生产环境 ELK/云日志收集。
 */

export type LogLevel = 'info' | 'error' | 'warn';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  meta?: Record<string, unknown>;
}

export function createLogger(service: string) {
  return function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...meta,
    };

    const serialized = JSON.stringify(entry);

    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  };
}

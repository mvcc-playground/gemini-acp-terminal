import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const LOGS_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOGS_DIR, `acp-${new Date().toISOString().replace(/:/g, "-").split(".")[0]}.log`);

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  await mkdir(LOGS_DIR, { recursive: true });
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

async function writeLog(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = data
    ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data, null, 2)}`
    : `[${timestamp}] [${level}] ${message}`;

  // Write to file
  try {
    await appendFile(LOG_FILE, logMessage + "\n");
  } catch (error) {
    console.error("Failed to write log:", error);
  }

  // Only write errors to console (keep debug in files only)
  if (level === LogLevel.ERROR) {
    console.error(logMessage);
  }
}

export const logger = {
  debug: (message: string, data?: any) => writeLog(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => writeLog(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => writeLog(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => writeLog(LogLevel.ERROR, message, data),
  getLogFile: () => LOG_FILE,
};

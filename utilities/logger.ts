import fs from "fs";
import path from "path";
import pino, { type LoggerOptions, type Logger } from "pino";

// Define colors for pretty-printing
const colors: Record<string, string> = {
  trace: "\x1b[37m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[35m",
  reset: "\x1b[0m",
};

// Log type
interface LogData {
  time: number;
  level: string;
  name: string;
  msg: string;
}

// Pretty-print function for console output
function prettyPrint(log: LogData): string {
  const timestamp = new Date(log.time).toISOString();
  const color = colors[log.level] || colors.info;
  return `${timestamp} ${color}[${log.name}] ${log.level}: ${log.msg}${colors.reset}`;
}

// Stream for pretty-printing logs to the console
const prettyStream = {
  write: (chunk: string): void => {
    try {
      const log: LogData = JSON.parse(chunk);
      console.log(prettyPrint(log));
    } catch (error) {
      console.error("Error parsing log data:", error);
    }
  },
};

// Create a JSONL stream
const jsonlStream = (filePath: string): fs.WriteStream =>
  fs.createWriteStream(filePath, { flags: "a" });

export function createLogger(
  moduleName: string,
  format: "plain" | "jsonl" = "plain"
): Logger {
  const logDir = "logs";
  const jsonlFilePath = path.join(logDir, `${moduleName}.jsonl`);
  const logFilePath = path.join(logDir, `${moduleName}.log`);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let logFileStream: fs.WriteStream;
  if (format === "jsonl") {
    logFileStream = jsonlStream(jsonlFilePath);
  } else {
    logFileStream = fs.createWriteStream(logFilePath, { flags: "a" });
  }

  const options: LoggerOptions = {
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    base: { name: moduleName },
  };

  return pino(
    options,
    pino.multistream([{ stream: prettyStream }, { stream: logFileStream }])
  );
}

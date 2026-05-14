import type { ZodIssue } from "zod";

export function formatZodErrors(issues: ZodIssue[]): string {
  return issues
    .map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}

/**
 * Strip internal filesystem paths from error messages to avoid
 * leaking server directory structure to API consumers.
 */
export function stripInternalPaths(message: string): string {
  return message.replace(/\/(tmp|data|app|opt|home|workspace)\b[^\s'")}]*/g, "[internal]");
}

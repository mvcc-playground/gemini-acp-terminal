import chalk from "chalk";

/**
 * Simple markdown renderer for terminal output
 * Converts markdown syntax to colored terminal output
 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const rendered: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      rendered.push("");
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        codeBlockLang = line.substring(3).trim();
        rendered.push(
          chalk.gray("┌─ Code") +
            (codeBlockLang ? chalk.gray(` (${codeBlockLang})`) : "")
        );
        inCodeBlock = true;
      } else {
        rendered.push(chalk.gray("└────────────"));
        inCodeBlock = false;
        codeBlockLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      rendered.push(chalk.bgBlack.white(`│ ${line}`));
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch && headerMatch[1] && headerMatch[2]) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const colors = [
        chalk.bold.cyan,
        chalk.bold.green,
        chalk.bold.yellow,
        chalk.bold.white,
        chalk.bold.magenta,
        chalk.bold.blue,
      ];
      const color = colors[level - 1] || chalk.bold;
      rendered.push(color(text));
      continue;
    }

    // Lists (unordered)
    if (line.match(/^\s*[-*+]\s+/)) {
      const indent = line.match(/^(\s*)/)?.[1] || "";
      const content = line.replace(/^\s*[-*+]\s+/, "");
      rendered.push(indent + chalk.cyan("•") + " " + processInlineMarkdown(content));
      continue;
    }

    // Lists (ordered)
    if (line.match(/^\s*\d+\.\s+/)) {
      const match = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (match && match[3]) {
        const indent = match[1] || "";
        const num = match[2] || "";
        const content = match[3];
        rendered.push(
          indent + chalk.cyan(num + ".") + " " + processInlineMarkdown(content)
        );
        continue;
      }
    }

    // Blockquotes
    if (line.startsWith(">")) {
      const content = line.substring(1).trim();
      rendered.push(chalk.gray("│ ") + chalk.italic(processInlineMarkdown(content)));
      continue;
    }

    // Horizontal rules
    if (line.match(/^[-*_]{3,}$/)) {
      rendered.push(chalk.gray("─".repeat(60)));
      continue;
    }

    // Regular lines with inline markdown
    if (line.trim()) {
      rendered.push(processInlineMarkdown(line));
    } else {
      rendered.push("");
    }
  }

  return rendered.join("\n");
}

/**
 * Process inline markdown syntax (bold, italic, code, links)
 */
function processInlineMarkdown(text: string): string {
  let result = text;

  // Inline code
  result = result.replace(/`([^`]+)`/g, (_, code) => chalk.bgBlack.cyan(` ${code} `));

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, text) => chalk.bold(text));

  // Italic
  result = result.replace(/\*([^*]+)\*/g, (_, text) => chalk.italic(text));

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
    chalk.blue.underline(text) + chalk.gray(` (${url})`)
  );

  return result;
}

/**
 * Strip all markdown syntax (fallback for plain text)
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "") // Headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
    .replace(/\*(.+?)\*/g, "$1") // Italic
    .replace(/`(.+?)`/g, "$1") // Inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Links
    .replace(/^>\s+/gm, "") // Blockquotes
    .replace(/^[-*+]\s+/gm, "• ") // Unordered lists
    .replace(/^\d+\.\s+/gm, "• "); // Ordered lists
}

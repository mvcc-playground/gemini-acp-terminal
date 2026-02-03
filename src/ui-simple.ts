import chalk from "chalk";
import * as readline from "readline/promises";
import type { AgentResponse } from "./client";
import { renderMarkdown } from "./utils/markdown";

export interface UIMessage {
  role: "user" | "agent" | "system";
  content: string;
}

export class TerminalUI {
  private messages: UIMessage[] = [];
  private isWaitingResponse = false;
  private streamingContent = "";
  private rl: readline.Interface | null = null;

  async init() {
    console.clear();
    console.log(
      chalk.blue.bold(
        "\n╔═══════════════════════════════════════════════════════════╗\n" +
          "║          🤖  ACP Terminal Client - Gemini AI          ║\n" +
          "╚═══════════════════════════════════════════════════════════╝\n"
      )
    );
  }

  addMessage(role: "user" | "agent" | "system", content: string) {
    this.messages.push({ role, content });

    if (role === "user") {
      console.log(
        chalk.cyan.bold("\n┌─ 👤 You") +
          chalk.cyan("\n│ ") +
          chalk.cyan(content.replace(/\n/g, "\n│ ")) +
          chalk.cyan("\n└─────────────────────────────────────────────────────────────")
      );
    } else if (role === "agent") {
      console.log(
        chalk.green.bold("\n┌─ 🤖 Gemini") +
          chalk.green("\n│ ") +
          chalk.green(content.replace(/\n/g, "\n│ ")) +
          chalk.green("\n└─────────────────────────────────────────────────────────────")
      );
    } else {
      console.log(
        chalk.yellow.dim("│ ") +
          chalk.yellow.dim(content.replace(/\n/g, "\n│ "))
      );
    }
  }

  startWaiting() {
    this.isWaitingResponse = true;
    this.streamingContent = "";
    console.log(chalk.green.bold("\n┌─ 🤖 Gemini"));
    process.stdout.write(chalk.green("│ "));
  }

  updateStreaming(content: string) {
    this.streamingContent += content;
    // Handle newlines in streaming content
    const formattedContent = content.replace(/\n/g, "\n│ ");
    process.stdout.write(chalk.green(formattedContent));
  }

  finishWaiting() {
    if (this.streamingContent) {
      this.messages.push({ role: "agent", content: this.streamingContent });

      // Move to new line after streaming
      console.log("");

      // Clear everything after the header and re-render with markdown
      const rendered = renderMarkdown(this.streamingContent);
      const lines = rendered.split("\n");

      // Move cursor up and clear
      const lineCount = this.streamingContent.split("\n").length + 1;
      for (let i = 0; i < lineCount + 1; i++) {
        process.stdout.write("\x1b[1A\x1b[2K"); // Move up and clear line
      }

      // Re-render with formatted markdown
      console.log(chalk.green.bold("┌─ 🤖 Gemini"));
      lines.forEach((line) => {
        console.log("│ " + line);
      });
      console.log(
        chalk.green("└─────────────────────────────────────────────────────────────")
      );
    }
    this.isWaitingResponse = false;
    this.streamingContent = "";
  }

  async setOnSubmit(callback: (message: string) => Promise<void>) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Input loop
    while (true) {
      if (!this.isWaitingResponse) {
        const message = await this.rl.question(
          chalk.cyan.bold("\n┌─ 💬 Your message\n│ ") + chalk.cyan("→ ")
        );

        if (message.trim()) {
          await callback(message.trim());
        }
      } else {
        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  showWelcome() {
    console.log(
      chalk.yellow.dim(
        "│ ✨ Welcome! Type your message below or 'exit' to quit.\n" +
          "│ 📝 All conversations are saved automatically."
      )
    );
  }

  showError(error: string) {
    console.log(
      chalk.red.bold("\n╔═══ ❌ ERROR ═══════════════════════════════════════════════╗")
    );
    console.log(chalk.red("║ " + error.replace(/\n/g, "\n║ ")));
    console.log(
      chalk.red.bold("╚═══════════════════════════════════════════════════════════════╝")
    );
  }

  clear() {
    console.clear();
    this.messages = [];
  }

  close() {
    if (this.rl) {
      this.rl.close();
    }
  }
}

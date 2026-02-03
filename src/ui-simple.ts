import chalk from "chalk";
import * as readline from "readline/promises";
import type { AgentResponse } from "./client";

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
    console.log(chalk.blue.bold("\n🤖 ACP Terminal Client - Gemini AI\n"));
  }

  addMessage(role: "user" | "agent" | "system", content: string) {
    this.messages.push({ role, content });

    const icon = role === "user" ? "👤" : role === "agent" ? "🤖" : "ℹ️";
    const label = role === "user" ? "You" : role === "agent" ? "Agent" : "System";

    const color =
      role === "user"
        ? chalk.cyan
        : role === "agent"
          ? chalk.green
          : chalk.yellow;

    console.log(color.bold(`\n${icon} ${label}:`));
    console.log(color(content));
  }

  startWaiting() {
    this.isWaitingResponse = true;
    this.streamingContent = "";
    console.log(chalk.green.bold("\n🤖 Agent:"));
    process.stdout.write(chalk.green(" "));
  }

  updateStreaming(content: string) {
    this.streamingContent += content;
    process.stdout.write(chalk.green(content));
  }

  finishWaiting() {
    if (this.streamingContent) {
      this.messages.push({ role: "agent", content: this.streamingContent });
    }
    this.isWaitingResponse = false;
    this.streamingContent = "";
    console.log("\n");
  }

  async setOnSubmit(callback: (message: string) => Promise<void>) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Input loop
    while (true) {
      if (!this.isWaitingResponse) {
        const message = await this.rl.question(chalk.cyan.bold("\n💬 You: "));

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
    this.addMessage(
      "system",
      "Welcome to ACP Terminal Client! Connected to Gemini AI.\nType your message to start chatting or 'exit' to quit."
    );
  }

  showError(error: string) {
    console.log(chalk.red.bold("\n❌ Error:"), chalk.red(error));
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

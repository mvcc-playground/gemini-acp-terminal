import { loadConfig } from "./utils/config";
import { ACPClient } from "./client";
import { SessionManager } from "./session";
import { TerminalUI } from "./ui-simple";

async function main() {
  // Load configuration
  const config = loadConfig();

  // Initialize components
  const ui = new TerminalUI();
  const client = new ACPClient(config);
  const sessionManager = new SessionManager();

  await ui.init();

  ui.addMessage("system", "🚀 Initializing ACP connection...");

  try {
    // Connect to agent with streaming callback
    await client.connect((response) => {
      if (response.type === "text") {
        ui.updateStreaming(response.content);
      } else if (response.type === "tool_call") {
        ui.updateStreaming(`\n\n${response.content}\n\n`);
      } else if (response.type === "error") {
        ui.showError(response.content);
      }
    });
    ui.addMessage("system", "✅ Connected to Gemini agent");

    // Create new session
    await client.createSession();
    const session = await sessionManager.createNewSession();
    ui.addMessage("system", `📝 New session created: ${session.id}`);

    ui.showWelcome();

    // Set up message handler
    ui.setOnSubmit(async (message: string) => {
      // Check for exit command
      if (message.toLowerCase() === "exit") {
        await cleanup();
        process.exit(0);
      }

      // Add user message
      ui.addMessage("user", message);
      sessionManager.addMessage("user", message);
      await sessionManager.saveSession();

      // Start waiting for response
      ui.startWaiting();

      try {
        // Send prompt to agent
        await client.sendPrompt(message);

        // Finish waiting
        ui.finishWaiting();

        // Save agent response to session
        const lastMessage = sessionManager.getCurrentSession()?.messages.slice(-1)[0];
        if (lastMessage?.role === "agent") {
          await sessionManager.saveSession();
        }
      } catch (error) {
        ui.showError(
          error instanceof Error ? error.message : "Failed to send message"
        );
        ui.finishWaiting();
      }
    });
  } catch (error) {
    ui.showError(
      error instanceof Error
        ? error.message
        : "Failed to connect to agent. Make sure Gemini CLI is installed and configured."
    );

    ui.addMessage(
      "system",
      "\n💡 Tips:\n" +
        "1. If you're not logged in, run: gemini\n" +
        "2. Or set GEMINI_API_KEY in .env file\n" +
        "3. Get API key at: https://aistudio.google.com/apikey"
    );

    setTimeout(() => process.exit(1), 5000);
  }

  async function cleanup() {
    ui.addMessage("system", "👋 Saving session and disconnecting...");
    await sessionManager.saveSession();
    await client.disconnect();
  }

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

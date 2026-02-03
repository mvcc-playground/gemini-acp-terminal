import { loadConfig } from "./utils/config";
import { ACPClient } from "./client";
import { SessionManager } from "./session";
import { TerminalUI } from "./ui-simple";
import { logger } from "./utils/logger";

async function main() {
  logger.info("=== ACP Terminal Client Starting ===");

  // Load configuration
  logger.info("Loading configuration...");
  const config = loadConfig();
  logger.debug("Config loaded", config);

  // Initialize components
  logger.info("Initializing components...");
  const ui = new TerminalUI();
  const client = new ACPClient(config);
  const sessionManager = new SessionManager();

  await ui.init();

  ui.addMessage("system", `🚀 Initializing ACP connection...\n📝 Logs: ${logger.getLogFile()}`);
  logger.info("UI initialized");

  try {
    // Connect to agent with streaming callback
    logger.info("Connecting to agent...");
    await client.connect((response) => {
      logger.debug("Agent response", response);
      if (response.type === "text") {
        ui.updateStreaming(response.content);
      } else if (response.type === "tool_call") {
        ui.updateStreaming(`\n\n${response.content}\n\n`);
      } else if (response.type === "error") {
        ui.showError(response.content);
      }
    });
    logger.info("Connected to agent successfully");
    ui.addMessage("system", "✅ Connected to Gemini agent");

    // Create new session
    logger.info("Creating new session...");
    await client.createSession();
    const session = await sessionManager.createNewSession();
    logger.info("Session created", { sessionId: session.id });
    ui.addMessage("system", `📝 New session created: ${session.id}`);

    ui.showWelcome();

    // Set up message handler
    logger.info("Setting up message handler...");
    ui.setOnSubmit(async (message: string) => {
      logger.info("User message received", { message });

      // Check for exit command
      if (message.toLowerCase() === "exit") {
        logger.info("Exit command received");
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
        logger.info("Sending prompt to agent...");
        await client.sendPrompt(message);
        logger.info("Prompt sent successfully");

        // Finish waiting
        ui.finishWaiting();

        // Save agent response to session
        const lastMessage = sessionManager.getCurrentSession()?.messages.slice(-1)[0];
        if (lastMessage?.role === "agent") {
          await sessionManager.saveSession();
        }
      } catch (error) {
        logger.error("Error sending prompt", error);
        ui.showError(
          error instanceof Error ? error.message : "Failed to send message"
        );
        ui.finishWaiting();
      }
    });
    logger.info("Application ready for user input");
  } catch (error) {
    logger.error("Fatal error during initialization", error);
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
        "3. Get API key at: https://aistudio.google.com/apikey\n\n" +
        `📝 Check logs at: ${logger.getLogFile()}`
    );

    setTimeout(() => process.exit(1), 5000);
  }

  async function cleanup() {
    logger.info("Cleanup started");
    ui.addMessage("system", "👋 Saving session and disconnecting...");
    await sessionManager.saveSession();
    await client.disconnect();
    logger.info("Cleanup completed");
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

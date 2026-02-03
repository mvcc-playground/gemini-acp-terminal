import { spawn, type ChildProcess } from "child_process";
import { Writable, Readable } from "stream";
import * as acp from "@agentclientprotocol/sdk";
import type { Config } from "./utils/config";
import { logger } from "./utils/logger";

export interface AgentResponse {
  type: "text" | "tool_call" | "error";
  content: string;
}

interface ClientImplementation {
  sessionUpdate(params: any): Promise<void>;
  requestPermission(params: any): Promise<any>;
  readTextFile(params: any): Promise<any>;
  writeTextFile(params: any): Promise<any>;
}

export class ACPClient {
  private process: ChildProcess | null = null;
  private connection: acp.ClientSideConnection | null = null;
  private sessionId: string | null = null;
  private onUpdate?: (update: AgentResponse) => void;

  constructor(private config: Config) {}

  async connect(onUpdate?: (update: AgentResponse) => void): Promise<void> {
    logger.info("Starting ACP connection...");
    this.onUpdate = onUpdate;

    // Parse agent command
    const parts = this.config.agentPath.split(" ");
    const command = parts[0] || "gemini";
    const args = parts.slice(1);

    logger.debug("Agent command", { command, args });

    // Setup environment
    const env: any = { ...process.env };
    if (this.config.geminiApiKey) {
      env.GEMINI_API_KEY = this.config.geminiApiKey;
    }
    if (this.config.useVertexAI) {
      env.GOOGLE_GENAI_USE_VERTEXAI = "true";
    }

    // Spawn agent process
    logger.info("Spawning agent process...");
    try {
      this.process = spawn(command, args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });
      logger.info("Agent process spawned successfully");
    } catch (error) {
      logger.error("Failed to spawn agent process", error);
      throw new Error(
        `Failed to spawn agent process: ${error instanceof Error ? error.message : "Unknown error"}\n` +
          `Command: ${command} ${args.join(" ")}`
      );
    }

    const stdin = this.process.stdin;
    const stdout = this.process.stdout;
    const stderr = this.process.stderr;

    if (!stdin || !stdout) {
      logger.error("Failed to get process stdio");
      throw new Error("Failed to get process stdio");
    }

    logger.debug("Process stdio acquired");

    // Handle process errors
    this.process.on("error", (error) => {
      logger.error("Agent process error", error);
      if (this.onUpdate) {
        this.onUpdate({
          type: "error",
          content: `Process error: ${error.message}`,
        });
      }
    });

    this.process.on("exit", (code, signal) => {
      logger.info("Agent process exited", { code, signal });
      if (code !== 0 && code !== null) {
        logger.warn(`Agent process exited with code ${code}`);
      }
    });

    // Log stderr for debugging
    if (stderr) {
      stderr.on("data", (data) => {
        const message = data.toString();
        logger.debug("Agent stderr", { message });
        // Only log non-empty stderr that isn't just progress info
        if (message.trim() && !message.includes("Resolving")) {
          console.error("Agent stderr:", message);
        }
      });
    }

    logger.info("Creating Web streams...");
    // Create streams
    const input = Writable.toWeb(stdin as any);
    const output = Readable.toWeb(stdout as any);
    logger.debug("Web streams created");

    // Create client implementation
    logger.info("Creating client implementation...");
    const clientImpl: ClientImplementation = {
      sessionUpdate: async (params: any) => {
        logger.debug("Session update received", params);
        const update = params.update;

        if (!this.onUpdate) return;

        switch (update.sessionUpdate) {
          case "agent_message_chunk":
            if (update.content.type === "text") {
              this.onUpdate({
                type: "text",
                content: update.content.text || "",
              });
            }
            break;

          case "tool_call":
            this.onUpdate({
              type: "tool_call",
              content: `[Tool: ${update.title}]`,
            });
            break;

          case "tool_call_update":
            this.onUpdate({
              type: "tool_call",
              content: `[${update.title}: ${update.status}]`,
            });
            break;
        }
      },

      requestPermission: async (params: any) => {
        logger.info("Permission requested", params);
        // Auto-approve for now (could be made interactive later)
        const firstOption = params.options?.[0];
        if (firstOption) {
          return {
            outcome: {
              outcome: "selected",
              optionId: firstOption.optionId,
            },
          };
        }
        return {
          outcome: {
            outcome: "cancelled",
          },
        };
      },

      readTextFile: async (params: any) => {
        logger.debug("Read text file requested", params);
        return { content: "" };
      },

      writeTextFile: async (params: any) => {
        logger.debug("Write text file requested", params);
        return {};
      },
    };

    // Create ACP connection
    logger.info("Creating ACP ndJsonStream...");
    const stream = acp.ndJsonStream(input, output);
    logger.info("Creating ClientSideConnection...");
    this.connection = new acp.ClientSideConnection(
      (_agent: any) => clientImpl,
      stream
    );
    logger.info("ClientSideConnection created");

    // Initialize connection with timeout
    logger.info("Initializing ACP connection...");
    try {
      const initPromise = this.connection.initialize({
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {
          fs: {
            readTextFile: false,
            writeTextFile: false,
          },
        },
      });

      // Add timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection initialization timeout (30s)")), 30000)
      );

      const initResult = await Promise.race([initPromise, timeoutPromise]);
      logger.info("ACP connection initialized successfully", initResult);
    } catch (error) {
      logger.error("Failed to initialize ACP connection", error);
      throw error;
    }
  }

  async createSession(): Promise<string> {
    logger.info("Creating new ACP session...");
    if (!this.connection) {
      logger.error("Cannot create session: not connected");
      throw new Error("Not connected");
    }

    try {
      const result = await this.connection.newSession({
        cwd: process.cwd(),
        mcpServers: [],
      });

      this.sessionId = result.sessionId;
      logger.info("Session created successfully", { sessionId: this.sessionId });
      return this.sessionId;
    } catch (error) {
      logger.error("Failed to create session", error);
      throw error;
    }
  }

  async sendPrompt(prompt: string): Promise<void> {
    logger.info("Sending prompt to agent", { prompt: prompt.substring(0, 100) });
    if (!this.connection || !this.sessionId) {
      logger.error("Cannot send prompt: not connected or no session");
      throw new Error("Not connected or no session");
    }

    try {
      const result = await this.connection.prompt({
        sessionId: this.sessionId,
        prompt: [
          {
            type: "text",
            text: prompt,
          },
        ],
      });
      logger.info("Prompt sent successfully", result);
    } catch (error) {
      logger.error("Failed to send prompt", error);
      if (this.onUpdate) {
        this.onUpdate({
          type: "error",
          content: error instanceof Error ? error.message : "Unknown error",
        });
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnecting from agent...");
    if (this.process) {
      this.process.kill();
      this.process = null;
      logger.info("Agent process killed");
    }
    this.connection = null;
    this.sessionId = null;
    logger.info("Disconnected successfully");
  }
}

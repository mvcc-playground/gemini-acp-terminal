import { spawn, type ChildProcess } from "child_process";
import { Writable, Readable } from "stream";
import * as acp from "@agentclientprotocol/sdk";
import type { Config } from "./utils/config";

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
    this.onUpdate = onUpdate;

    // Parse agent command
    const parts = this.config.agentPath.split(" ");
    const command = parts[0] || "gemini";
    const args = parts.slice(1);

    // Setup environment
    const env: any = { ...process.env };
    if (this.config.geminiApiKey) {
      env.GEMINI_API_KEY = this.config.geminiApiKey;
    }
    if (this.config.useVertexAI) {
      env.GOOGLE_GENAI_USE_VERTEXAI = "true";
    }

    // Spawn agent process
    try {
      this.process = spawn(command, args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });
    } catch (error) {
      throw new Error(
        `Failed to spawn agent process: ${error instanceof Error ? error.message : "Unknown error"}\n` +
          `Command: ${command} ${args.join(" ")}`
      );
    }

    const stdin = this.process.stdin;
    const stdout = this.process.stdout;
    const stderr = this.process.stderr;

    if (!stdin || !stdout) {
      throw new Error("Failed to get process stdio");
    }

    // Handle process errors
    this.process.on("error", (error) => {
      console.error("Agent process error:", error);
      if (this.onUpdate) {
        this.onUpdate({
          type: "error",
          content: `Process error: ${error.message}`,
        });
      }
    });

    this.process.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`Agent process exited with code ${code}`);
      }
    });

    // Log stderr for debugging
    if (stderr) {
      stderr.on("data", (data) => {
        const message = data.toString();
        // Only log non-empty stderr that isn't just progress info
        if (message.trim() && !message.includes("Resolving")) {
          console.error("Agent stderr:", message);
        }
      });
    }

    // Create streams
    const input = Writable.toWeb(stdin as any);
    const output = Readable.toWeb(stdout as any);

    // Create client implementation
    const clientImpl: ClientImplementation = {
      sessionUpdate: async (params: any) => {
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
        return { content: "" };
      },

      writeTextFile: async (params: any) => {
        return {};
      },
    };

    // Create ACP connection
    const stream = acp.ndJsonStream(input, output);
    this.connection = new acp.ClientSideConnection(
      (_agent: any) => clientImpl,
      stream
    );

    // Initialize connection
    const initResult = await this.connection.initialize({
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {
        fs: {
          readTextFile: false,
          writeTextFile: false,
        },
      },
    });
  }

  async createSession(): Promise<string> {
    if (!this.connection) {
      throw new Error("Not connected");
    }

    const result = await this.connection.newSession({
      cwd: process.cwd(),
      mcpServers: [],
    });

    this.sessionId = result.sessionId;
    return this.sessionId;
  }

  async sendPrompt(prompt: string): Promise<void> {
    if (!this.connection || !this.sessionId) {
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
    } catch (error) {
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
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connection = null;
    this.sessionId = null;
  }
}

import { writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export interface SessionMessage {
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export interface SessionData {
  id: string;
  created: Date;
  lastModified: Date;
  messages: SessionMessage[];
}

const SESSIONS_DIR = join(process.cwd(), "sessions");

export class SessionManager {
  private currentSession: SessionData | null = null;

  constructor() {
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  async createNewSession(): Promise<SessionData> {
    const session: SessionData = {
      id: Date.now().toString(),
      created: new Date(),
      lastModified: new Date(),
      messages: [],
    };

    this.currentSession = session;
    await this.saveSession();
    return session;
  }

  async loadSession(id: string): Promise<SessionData | null> {
    try {
      const path = join(SESSIONS_DIR, `${id}.json`);
      const data = await readFile(path, "utf-8");
      this.currentSession = JSON.parse(data);
      return this.currentSession;
    } catch {
      return null;
    }
  }

  async listSessions(): Promise<SessionData[]> {
    try {
      const files = await readdir(SESSIONS_DIR);
      const sessions: SessionData[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const data = await readFile(join(SESSIONS_DIR, file), "utf-8");
          sessions.push(JSON.parse(data));
        }
      }

      return sessions.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
      );
    } catch {
      return [];
    }
  }

  addMessage(role: "user" | "agent", content: string) {
    if (!this.currentSession) return;

    this.currentSession.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    this.currentSession.lastModified = new Date();
  }

  async saveSession() {
    if (!this.currentSession) return;

    const path = join(SESSIONS_DIR, `${this.currentSession.id}.json`);
    await writeFile(path, JSON.stringify(this.currentSession, null, 2));
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }
}

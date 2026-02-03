# 🤖 ACP Terminal Client

Interactive terminal client for Agent Client Protocol with Gemini AI.

## ✨ Features

- 🎨 Beautiful TUI powered by OpenTUI
- 📝 Session management with history
- 🔄 Real-time streaming responses
- 🎯 Simple and clean codebase
- 🚀 Fast with Bun runtime
- 💾 Automatic session saving

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Gemini CLI access (via Google login or API key)

### Installation

```bash
# Dependencies are already installed!
bun install
```

### Configuration

#### Option 1: Google Login (Easiest)

If you're already logged into Gemini:

```bash
# Just run it!
bun start
```

#### Option 2: API Key

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Get your API key at: https://aistudio.google.com/apikey

### Running

```bash
# Start the client
bun start

# Or with auto-reload during development
bun dev
```

## 📖 Usage

1. Launch the app with `bun start`
2. Type your message in the input box
3. Press Enter to send
4. Watch the agent respond in real-time!
5. Type `exit` or press Ctrl+C to quit

## 🗂️ Project Structure

```
acp-terminal-client/
├── src/
│   ├── index.ts          # Main entry point
│   ├── client.ts         # ACP client connection
│   ├── ui.ts             # Terminal UI (OpenTUI)
│   ├── session.ts        # Session & history management
│   └── utils/
│       └── config.ts     # Configuration loader
├── sessions/             # Saved conversation history
├── .env                  # Your config (create this!)
├── .env.example          # Config template
└── package.json
```

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **UI**: [OpenTUI](https://opentui.com) - Modern terminal UI library
- **Protocol**: [ACP SDK](https://agentclientprotocol.com) - Agent Client Protocol
- **Agent**: [Gemini CLI](https://github.com/google-gemini/gemini-cli) - Google Gemini
- **Styling**: [Chalk](https://github.com/chalk/chalk) - Terminal colors
- **Markdown**: [marked-terminal](https://github.com/mikaelbr/marked-terminal) - Beautiful markdown rendering

## 🎯 Architecture

The app connects to Gemini CLI via the Agent Client Protocol:

1. **Client** (src/client.ts) spawns Gemini CLI as subprocess
2. **ACP Connection** handles JSON-RPC communication over stdio
3. **Session Manager** saves conversation history to disk
4. **Terminal UI** displays messages with streaming support

## 📝 Session History

All conversations are automatically saved in the `sessions/` directory as JSON files. Each session includes:

- Unique session ID
- All messages with timestamps
- Created and last modified dates

## 🔧 Troubleshooting

### "Not logged in to Gemini"

Run Gemini CLI first to authenticate:

```bash
npx @google/gemini-cli
```

Select "Login with Google" and authenticate via browser.

### "GEMINI_API_KEY not found"

Either:
1. Login via Google (recommended), or
2. Create `.env` file with your API key

### "Failed to spawn agent process"

Make sure you have internet connection and Gemini CLI is accessible:

```bash
# Test if Gemini CLI works
npx @google/gemini-cli --version
```

## 📄 License

MIT

## 🤝 Contributing

Feel free to open issues or PRs!

---

Built with ❤️ using Bun, OpenTUI, and Agent Client Protocol

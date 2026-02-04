# Documentação de Configuração do Gemini ACP

## Visão Geral

Este projeto utiliza o comando `gemini --experimental-acp` para iniciar a CLI oficial do Gemini em um modo compatível com o **Agent Client Protocol (ACP)**. Isso permite que o cliente de terminal (`acp-terminal-client`) se comunique programaticamente com o agente Gemini via JSON-RPC utilizando a entrada e saída padrão (stdio).

## O Comando

```bash
gemini --experimental-acp
```

Este comando ativa o modo experimental ACP na CLI do Gemini.

### Definição no Código Fonte da CLI

Na CLI do Gemini (`@google/gemini-cli`), esta opção é definida em `dist/src/config/config.js`:

```javascript
.option('experimental-acp', {
    type: 'boolean',
    description: 'Starts the agent in ACP mode',
})
```

Internamente, ela também pode estar associada a funcionalidades de integração, referenciada como `experimentalZedIntegration`.

## Configuração no Projeto

O comando é configurado em dois locais principais neste projeto:

1.  **Variável de Ambiente (`.env`)**
    
    O arquivo `.env.example` sugere a configuração da variável `AGENT_PATH`. Se você criar um arquivo `.env`, poderá sobrescrever o comando padrão aqui.

    ```bash
    # Agent Configuration - IMPORTANT: Use --experimental-acp flag for ACP mode
    AGENT_PATH=gemini --experimental-acp
    ```

2.  **Código Fonte (`src/utils/config.ts`)**

    Caso a variável de ambiente `AGENT_PATH` não esteja definida, o projeto utiliza um valor padrão *hardcoded* que garante o funcionamento correto do cliente.

    ```typescript
    // src/utils/config.ts
    export function loadConfig(): Config {
      // ...
      return {
        // ...
        agentPath: process.env.AGENT_PATH || "gemini --experimental-acp",
        // ...
      };
    }
    ```

## Fluxo de Execução

1.  O cliente inicia (`src/index.ts`).
2.  As configurações são carregadas via `loadConfig()`.
3.  A classe `ACPClient` (`src/client.ts`) é instanciada.
4.  O método `client.connect()` é chamado.
5.  O cliente executa o comando definido em `agentPath` como um processo filho (`spawn`).
6.  A comunicação é estabelecida via *streams* (stdin/stdout) usando o protocolo ACP.

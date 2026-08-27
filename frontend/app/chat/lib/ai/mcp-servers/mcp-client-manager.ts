import { experimental_createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  transport: 'stdio' | 'http';
  enabled: boolean;
  env?: Record<string, string>;
  /** Milliseconds to wait for connect + tool listing before giving up. */
  timeoutMs?: number;
  /** Allow re-initialization after a failure instead of caching the error. */
  reconnect?: boolean;
}

export interface MCPClientManager {
  init(): Promise<void>;
  getClient(serverName?: string): Promise<any>;
  getTools(serverName?: string): Promise<Record<string, any>>;
  getAllTools(): Promise<Record<string, any>>;
  isInitialized(serverName?: string): boolean;
  getAvailableServers(): string[];
  addServerConfig(config: MCPServerConfig): void;
  removeServerConfig(serverName: string): void;
  getServerConfig(serverName: string): MCPServerConfig | undefined;
  getAllConfigs(): Record<string, MCPServerConfig>;
  /** Close every client connection and reset state. */
  shutdown(): Promise<void>;
}

interface ClientState {
  client: any;
  tools: Record<string, any>;
  initialized: boolean;
  initPromise: Promise<void> | null;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const isBuildPhase =
  process.env.CI === 'true' ||
  process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Default servers. Secrets are read from the environment only — servers whose
 * credentials are missing are disabled rather than misconfigured.
 * Override/extend the whole set with MCP_SERVERS_CONFIG (JSON array).
 */
function defaultServerConfigs(): Record<string, MCPServerConfig> {
  const configs: Record<string, MCPServerConfig> = {
    github: {
      name: 'github',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      transport: 'stdio',
      enabled: Boolean(process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN),
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || '',
      },
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
    research: {
      name: 'research',
      url: process.env.MCP_RESEARCH_URL || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/mcp` : 'https://mcppro.onrender.com/mcp'),
      transport: 'http',
      enabled: true,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
    database: {
      name: 'database',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'],
      transport: 'stdio',
      enabled: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
    browser: {
      name: 'browser',
      url: process.env.MCP_BROWSER_URL || 'http://127.0.0.1:8002/mcp',
      transport: 'http',
      enabled: Boolean(process.env.BROWSERBASE_API_KEY || process.env.MCP_ENABLE_COMPUTER === 'true'),
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
    computer: {
      name: 'computer',
      url: process.env.MCP_COMPUTER_URL || 'http://127.0.0.1:8002/mcp',
      transport: 'http',
      enabled: !isBuildPhase && process.env.MCP_ENABLE_COMPUTER === 'true',
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
    rag: {
      name: 'rag',
      url: process.env.MCP_RAG_URL || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/mcp` : 'https://mcppro.onrender.com/mcp'),
      transport: 'http',
      enabled:
        !isBuildPhase && (process.env.MCP_ENABLE_RAG ?? 'true') === 'true',
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    },
  };

  if (process.env.SMITHERY_API_KEY) {
    configs.playwright = {
      name: 'playwright',
      command: 'cmd',
      args: [
        '/c',
        'npx',
        '-y',
        '@smithery/cli@latest',
        'run',
        '@microsoft/playwright-mcp',
        '--key',
        process.env.SMITHERY_API_KEY,
      ],
      transport: 'stdio',
      enabled: !isBuildPhase && process.env.MCP_ENABLE_PLAYWRIGHT !== 'false',
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    };
  }

  if (process.env.V0_BEARER_TOKEN) {
    configs.v0 = {
      name: 'v0',
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        'https://mcp.v0.dev',
        '--header',
        `Authorization: Bearer ${process.env.V0_BEARER_TOKEN}`,
      ],
      transport: 'stdio',
      enabled: !isBuildPhase && process.env.MCP_ENABLE_V0 !== 'false',
      timeoutMs: DEFAULT_TIMEOUT_MS,
      reconnect: true,
    };
  }

  return configs;
}

/** Optional full override via env: JSON array of MCPServerConfig. */
function loadEnvOverride(
  configs: Record<string, MCPServerConfig>
): Record<string, MCPServerConfig> {
  const raw = process.env.MCP_SERVERS_CONFIG;
  if (!raw) return configs;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('expected a JSON array');
    for (const entry of parsed) {
      if (entry && typeof entry.name === 'string') {
        configs[entry.name] = { ...entry, timeoutMs: entry.timeoutMs ?? DEFAULT_TIMEOUT_MS };
      }
    }
  } catch (err) {
    console.warn('Ignoring invalid MCP_SERVERS_CONFIG:', err);
  }
  return configs;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function createMCPClientManager(): MCPClientManager {
  const clients: Map<string, ClientState> = new Map();
  let globalInitPromise: Promise<void> | null = null;
  const serverConfigs = loadEnvOverride(defaultServerConfigs());

  function getClientState(serverName: string): ClientState {
    if (!clients.has(serverName)) {
      clients.set(serverName, {
        client: null,
        tools: {},
        initialized: false,
        initPromise: null,
      });
    }
    return clients.get(serverName)!;
  }

  async function initializeClient(serverName: string): Promise<void> {
    const config = serverConfigs[serverName];
    if (!config || !config.enabled) {
      throw new Error(`MCP server '${serverName}' is not configured or disabled`);
    }

    const state = getClientState(serverName);

    try {
      console.log(
        `[MCP] Initializing ${serverName} via ${config.transport} transport...`
      );

      let transport;

      if (config.transport === 'http') {
        if (!config.url) {
          throw new Error(`HTTP MCP server '${serverName}' requires a URL`);
        }
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      } else {
        if (!config.command || !config.args) {
          throw new Error(`Stdio MCP server '${serverName}' requires command and args`);
        }
        const transportOptions: any = {
          command: config.command,
          args: config.args,
        };
        if (config.env) {
          transportOptions.env = { ...process.env, ...config.env };
        }
        transport = new StdioClientTransport(transportOptions);
      }

      const client = await withTimeout(
        experimental_createMCPClient({ transport }),
        config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        `MCP connect (${serverName})`
      );

      const tools = await withTimeout(
        client.tools(),
        config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        `MCP tool listing (${serverName})`
      );

      state.client = client;
      state.tools = tools;
      state.initialized = true;
      console.log(`[MCP] ${serverName} ready (${Object.keys(tools).length} tools)`);
    } catch (error) {
      console.error(`[MCP] Failed to initialize ${serverName}:`, error);
      state.client = null;
      state.tools = {};
      state.initialized = false;
      // Never crash callers in build/CI; at runtime failures surface as
      // "server unavailable" through getAllTools() unless reconnect retries.
      if (isBuildPhase) {
        console.warn(`[MCP] Ignoring ${serverName} failure during build/CI`);
      } else if (!config.reconnect) {
        throw error;
      }
    }
  }

  async function ensureClient(serverName: string): Promise<any> {
    const config = serverConfigs[serverName];
    if (!config || !config.enabled) {
      throw new Error(`MCP server '${serverName}' is not configured or disabled`);
    }
    const state = getClientState(serverName);

    if (state.initialized && state.client) return state.client;

    if (state.initPromise) {
      await state.initPromise;
    } else {
      state.initPromise = initializeClient(serverName);
      try {
        await state.initPromise;
      } finally {
        state.initPromise = null;
      }
    }

    if (!state.initialized || !state.client) {
      throw new Error(`MCP server '${serverName}' is unavailable`);
    }
    return state.client;
  }

  return {
    async init(): Promise<void> {
      if (globalInitPromise) return globalInitPromise;

      const enabledServers = Object.keys(serverConfigs).filter(
        (name) => serverConfigs[name].enabled
      );
      if (enabledServers.length === 0) return;

      const allInitialized = enabledServers.every((name) => {
        const state = clients.get(name);
        return state && state.initialized && state.client;
      });
      if (allInitialized) return;

      globalInitPromise = Promise.allSettled(
        enabledServers.map((name) => ensureClient(name))
      ).then(() => {
        globalInitPromise = null;
      });

      await globalInitPromise;
    },

    async getClient(serverName: string = 'rag'): Promise<any> {
      return ensureClient(serverName);
    },

    async getTools(serverName: string = 'rag'): Promise<Record<string, any>> {
      await this.getClient(serverName);
      return getClientState(serverName).tools;
    },

    async getAllTools(): Promise<Record<string, any>> {
      const allTools: Record<string, any> = {};
      const enabledServers = Object.keys(serverConfigs).filter(
        (name) => serverConfigs[name].enabled
      );

      for (const serverName of enabledServers) {
        try {
          const tools = await this.getTools(serverName);
          for (const [toolName, toolDef] of Object.entries(tools)) {
            allTools[`${serverName}_${toolName}`] = toolDef;
          }
        } catch (error) {
          console.warn(`[MCP] Tools unavailable from ${serverName}:`, (error as Error).message);
        }
      }
      return allTools;
    },

    isInitialized(serverName: string = 'rag'): boolean {
      const state = clients.get(serverName);
      return state ? state.initialized && state.client !== null : false;
    },

    getAvailableServers(): string[] {
      return Object.keys(serverConfigs).filter((name) => serverConfigs[name].enabled);
    },

    addServerConfig(config: MCPServerConfig): void {
      serverConfigs[config.name] = config;
    },

    removeServerConfig(serverName: string): void {
      delete serverConfigs[serverName];
    },

    getServerConfig(serverName: string): MCPServerConfig | undefined {
      return serverConfigs[serverName];
    },

    getAllConfigs(): Record<string, MCPServerConfig> {
      return { ...serverConfigs };
    },

    async shutdown(): Promise<void> {
      for (const [name, state] of clients.entries()) {
        try {
          if (state.client?.close) {
            await state.client.close();
          }
        } catch (err) {
          console.warn(`[MCP] Error closing client ${name}:`, err);
        }
      }
      clients.clear();
      globalInitPromise = null;
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var _mcpClientManager_: MCPClientManager;
}

if (!globalThis._mcpClientManager_) {
  globalThis._mcpClientManager_ = createMCPClientManager();
}

export const initMCPClient = async (serverName?: string) => {
  if (serverName) {
    await globalThis._mcpClientManager_.getClient(serverName);
  } else {
    await globalThis._mcpClientManager_.init();
  }
};

export const mcpClientManager = globalThis._mcpClientManager_;

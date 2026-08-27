import { mcpClientManager, MCPServerConfig } from '@/app/chat/lib/ai/mcp-servers/mcp-client-manager';
import { getUser } from '@/app/chat/hooks/get-user';

export const revalidate = 0;

interface ServerMeta {
  name: string;
  label: string;
  category: 'research' | 'code' | 'database' | 'automation' | 'custom';
  description: string;
  transport: 'http' | 'stdio';
  enabled: boolean;
  connected: boolean;
  toolCount: number;
  url?: string;
  command?: string;
  featured?: boolean;
}

const SERVER_DIRECTORY: Record<string, { label: string; category: ServerMeta['category']; description: string; featured: boolean }> = {
  github: {
    label: 'GitHub Code & Repo Explorer',
    category: 'code',
    description: 'Deep code search, commit history, pull request reviews, and repository issues for research and development.',
    featured: true,
  },
  research: {
    label: 'Academic & Deep Research Search',
    category: 'research',
    description: 'Literature reviews, arXiv papers, live scholarly web crawling, and deep internet intelligence gathering.',
    featured: true,
  },
  database: {
    label: 'PostgreSQL & Database Introspector',
    category: 'database',
    description: 'Database schema reflection, table introspection, safe analytical SQL queries, and structured report synthesis.',
    featured: true,
  },
  browser: {
    label: 'Headless Browser & Cloud Web Automation',
    category: 'automation',
    description: 'Dynamic JavaScript page rendering, cloud browser navigation, form interaction, and live data extraction.',
    featured: true,
  },
  computer: {
    label: 'Computer Use & Desktop OS Agent',
    category: 'automation',
    description: 'Desktop OS automation, screenshot inspection, and local command execution environment.',
    featured: false,
  },
  rag: {
    label: 'Knowledge Base Vector RAG',
    category: 'research',
    description: 'Vector-indexed document chunk retrieval, semantic search across uploaded manuals, PDFs, and policies.',
    featured: false,
  },
  playwright: {
    label: 'Playwright Browser Automation',
    category: 'automation',
    description: 'Automated end-to-end browser testing and page scraping with screenshot capture.',
    featured: false,
  },
  v0: {
    label: 'v0 Component Generator',
    category: 'code',
    description: 'Generative React/UI component synthesis and code scaffolding.',
    featured: false,
  },
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await mcpClientManager.init().catch(() => {});
    const allConfigs = mcpClientManager.getAllConfigs();
    const serverList: ServerMeta[] = [];

    for (const [name, config] of Object.entries(allConfigs)) {
      const meta = SERVER_DIRECTORY[name] || {
        label: name.charAt(0).toUpperCase() + name.slice(1) + ' MCP Server',
        category: 'custom' as const,
        description: 'Custom Model Context Protocol connection endpoint.',
        featured: false,
      };

      let toolCount = 0;
      let connected = false;

      if (config.enabled) {
        try {
          const tools = await mcpClientManager.getTools(name);
          toolCount = Object.keys(tools || {}).length;
          connected = mcpClientManager.isInitialized(name) || toolCount > 0;
        } catch {
          connected = false;
        }
      }

      serverList.push({
        name,
        label: meta.label,
        category: meta.category,
        description: meta.description,
        transport: config.transport,
        enabled: config.enabled,
        connected,
        toolCount,
        url: config.url,
        command: config.command,
        featured: meta.featured,
      });
    }

    return Response.json({
      success: true,
      servers: serverList,
      totalCount: serverList.length,
      activeCount: serverList.filter((s) => s.enabled).length,
    });
  } catch (error: any) {
    console.error('[api/mcp/servers] GET error:', error);
    return Response.json(
      { error: error?.message || 'Failed to list MCP servers' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { name, enabled, url, transport, command, args, env } = body;

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Server name is required' }, { status: 400 });
    }

    const existing = mcpClientManager.getServerConfig(name);
    const newConfig: MCPServerConfig = {
      name,
      enabled: enabled ?? true,
      transport: transport || existing?.transport || (url ? 'http' : 'stdio'),
      url: url ?? existing?.url,
      command: command ?? existing?.command,
      args: args ?? existing?.args,
      env: env ?? existing?.env,
      timeoutMs: 15_000,
      reconnect: true,
    };

    mcpClientManager.addServerConfig(newConfig);

    return Response.json({
      success: true,
      config: newConfig,
      message: `MCP Server '${name}' updated successfully`,
    });
  } catch (error: any) {
    console.error('[api/mcp/servers] POST error:', error);
    return Response.json(
      { error: error?.message || 'Failed to update MCP server' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return Response.json({ error: 'Server name parameter is required' }, { status: 400 });
    }

    mcpClientManager.removeServerConfig(name);
    return Response.json({ success: true, message: `MCP Server '${name}' removed` });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to remove MCP server' }, { status: 500 });
  }
}
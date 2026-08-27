import { mcpClientManager } from '@/app/chat/lib/ai/mcp-servers/mcp-client-manager';
import { getUser } from '@/app/chat/hooks/get-user';

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { serverName } = await req.json();
    if (!serverName) {
      return Response.json({ error: 'serverName is required' }, { status: 400 });
    }

    const startTime = Date.now();
    const config = mcpClientManager.getServerConfig(serverName);
    if (!config) {
      return Response.json({ error: `Server '${serverName}' not found in configuration` }, { status: 404 });
    }

    const tools = await mcpClientManager.getTools(serverName);
    const latencyMs = Date.now() - startTime;
    const toolNames = Object.keys(tools || {});

    return Response.json({
      success: true,
      serverName,
      latencyMs,
      toolCount: toolNames.length,
      tools: toolNames,
      message: `Successfully connected to '${serverName}' (${toolNames.length} tools available, ${latencyMs}ms)`,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error?.message || 'Failed to connect to MCP server',
    }, { status: 500 });
  }
}
import { mcpClientManager } from '@/app/chat/lib/ai/mcp-servers/mcp-client-manager';
import { getUser } from '@/app/chat/hooks/get-user';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(req.url);
    const serverFilter = searchParams.get('server');

    await mcpClientManager.init().catch(() => {});
    const toolsList: Array<{
      id: string;
      name: string;
      server: string;
      description: string;
      parameters?: any;
    }> = [];

    const allConfigs = mcpClientManager.getAllConfigs();
    const targetServers = serverFilter
      ? [serverFilter]
      : Object.keys(allConfigs).filter((s) => allConfigs[s].enabled);

    for (const serverName of targetServers) {
      try {
        const tools = await mcpClientManager.getTools(serverName);
        for (const [toolName, toolDef] of Object.entries(tools || {})) {
          toolsList.push({
            id: `${serverName}_${toolName}`,
            name: toolName,
            server: serverName,
            description: (toolDef as any)?.description || `Execute ${toolName} on ${serverName}`,
            parameters: (toolDef as any)?.parameters?.shape
              ? Object.keys((toolDef as any).parameters.shape)
              : [],
          });
        }
      } catch (err: any) {
        console.warn(`[api/mcp/tools] Could not get tools for ${serverName}:`, err?.message);
      }
    }

    return Response.json({
      success: true,
      tools: toolsList,
      totalCount: toolsList.length,
    });
  } catch (error: any) {
    console.error('[api/mcp/tools] GET error:', error);
    return Response.json({ error: error?.message || 'Failed to list MCP tools' }, { status: 500 });
  }
}
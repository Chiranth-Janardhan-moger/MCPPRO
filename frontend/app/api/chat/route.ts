import { streamText, createDataStreamResponse } from "ai";
import { getUser } from '@/app/chat/hooks/get-user';
import { runWithRequestContext } from '@/lib/request-context';
import { getModelInfo, isProviderConfigured } from '@/lib/ai/models';
import { getLanguageModel } from '@/app/chat/lib/ai/providers/providers';
import { getGeneralAgentPrompt } from '@/app/chat/lib/ai/prompts/general-agent';
import { getMCPTools } from '@/voltagent/tools/mcpTools';
import { tavilySearchTool, generateChartTool, generateImageTool, searchUploadedDocumentsTool } from '@/voltagent/tools/customTools';

export const maxDuration = 60;

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
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const selectedModel: string | undefined =
      typeof body?.selectedModel === 'string' ? body.selectedModel : undefined;
    const customApiKeys: Record<string, string> =
      typeof body?.customApiKeys === 'object' && body.customApiKeys !== null
        ? body.customApiKeys
        : {};
    const modelInfo = selectedModel ? getModelInfo(selectedModel) : undefined;
    
    const hasKey =
      !modelInfo ||
      isProviderConfigured(modelInfo.provider) ||
      Boolean(customApiKeys[modelInfo.provider]?.trim());

    if (selectedModel && modelInfo && !hasKey) {
      return new Response(
        JSON.stringify({
          error: `Provider '${modelInfo.provider}' is not configured. Click the Settings icon to add your ${modelInfo.provider.toUpperCase()} API key.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return runWithRequestContext(
      { userId: user.id, selectedModel, customApiKeys },
      () =>
        createDataStreamResponse({
          async execute(dataStream) {
            try {
              const model = getLanguageModel(selectedModel);
              
              let mcpTools: Record<string, any> = {};
              try {
                mcpTools = await getMCPTools();
              } catch (err) {
                console.warn('[chat/route] MCP tools lookup skipped:', err);
              }

              const tools: Record<string, any> = {
                searchUploadedDocuments: {
                  description: searchUploadedDocumentsTool.description,
                  parameters: (searchUploadedDocumentsTool as any).parameters,
                  execute: searchUploadedDocumentsTool.execute,
                },
                tavilySearch: {
                  description: tavilySearchTool.description,
                  parameters: (tavilySearchTool as any).parameters,
                  execute: tavilySearchTool.execute,
                },
                generateChart: {
                  description: generateChartTool.description,
                  parameters: (generateChartTool as any).parameters,
                  execute: generateChartTool.execute,
                },
                generateImage: {
                  description: generateImageTool.description,
                  parameters: (generateImageTool as any).parameters,
                  execute: generateImageTool.execute,
                },
                ...mcpTools,
              };

              const result = streamText({
                model,
                system: getGeneralAgentPrompt(),
                messages,
                tools,
                maxSteps: 10,
              });

              result.mergeIntoDataStream(dataStream);
            } catch (error) {
              console.error("[chat/route] Stream processing error:", error);
              dataStream.writeMessageAnnotation({
                type: "error",
                value: {
                  error: error instanceof Error ? error.message : "Unknown error",
                },
              });
            }
          },
          onError: (error) =>
            `AI Stream error: ${error instanceof Error ? error.message : String(error)}`,
        })
    );
  } catch (error) {
    console.error("[chat/route] API route error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import { streamText, createDataStreamResponse } from "ai";
import { getUser } from '@/app/chat/hooks/get-user';
import { runWithRequestContext } from '@/lib/request-context';
import { getModelInfo, isProviderConfigured } from '@/lib/ai/models';
import { getLanguageModel } from '@/app/chat/lib/ai/providers/providers';
import { getGeneralAgentPrompt } from '@/app/chat/lib/ai/prompts/general-agent';
import { getMCPTools } from '@/voltagent/tools/mcpTools';
import {
  tavilySearchTool,
  generateChartTool,
  generateImageTool,
  searchUploadedDocumentsTool,
} from '@/voltagent/tools/customTools';
import { getSystemSettings } from '@/lib/services/admin-settings';
import { classifyQueryContext, RouterDecision } from '@/lib/ai/context-router';
import supabaseAdmin from '@/lib/supabase/admin';

export const maxDuration = 60;

export async function POST(req: Request) {
  const requestStartTime = Date.now();
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

    const settings = await getSystemSettings();
    const selectedModel: string =
      typeof body?.selectedModel === 'string' && body.selectedModel.trim()
        ? body.selectedModel.trim()
        : settings.default_model || 'gemini-3.6-flash';

    const customApiKeys: Record<string, string> =
      typeof body?.customApiKeys === 'object' && body.customApiKeys !== null
        ? body.customApiKeys
        : {};

    const modelInfo = getModelInfo(selectedModel);
    const provider = modelInfo?.provider;

    // Check if provider has a key in customKeys, system settings, or env
    const hasKey =
      !provider ||
      Boolean(customApiKeys[provider]?.trim()) ||
      Boolean(settings.api_keys[provider]?.trim()) ||
      (provider === 'google' && Boolean(settings.api_keys.gemini?.trim())) ||
      isProviderConfigured(provider);

    if (modelInfo && !hasKey) {
      return new Response(
        JSON.stringify({
          error: `Provider '${modelInfo.provider}' is not configured. Please add your API key in Settings or contact the Administrator.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Latest user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const userQuery = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';

    return runWithRequestContext(
      {
        userId: user.id,
        userEmail: user.email,
        selectedModel,
        customApiKeys,
        systemApiKeys: settings.api_keys as Record<string, string>,
      },
      () =>
        createDataStreamResponse({
          async execute(dataStream) {
            let routerDecision: RouterDecision | null = null;
            let finalGeneratedText = '';

            try {
              // 1. Run Context-Aware Routing using configured cheaper model
              if (settings.routing.enabled && userQuery) {
                try {
                  routerDecision = await classifyQueryContext(
                    userQuery,
                    messages.slice(-3),
                    customApiKeys[settings.routing.provider]
                  );

                  // Send Router Annotation to UI
                  dataStream.writeMessageAnnotation({
                    type: 'router_decision',
                    route: routerDecision.route,
                    confidence: routerDecision.confidence,
                    reasoning: routerDecision.reasoning,
                    refinedQuery: routerDecision.refinedQuery,
                    latencyMs: routerDecision.latencyMs,
                    model: routerDecision.modelUsed,
                  });
                } catch (routerErr) {
                  console.warn('[chat/route] Router evaluation warning:', routerErr);
                }
              }

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

              // Inject context router instructions based on classification
              let systemPrompt = getGeneralAgentPrompt();
              if (routerDecision) {
                if (routerDecision.route === 'RAG') {
                  systemPrompt += `\n\n[CONTEXT ROUTER GUIDANCE: The query intent was classified as RAG (${Math.round(routerDecision.confidence * 100)}% confidence). You MUST call searchUploadedDocuments with query "${routerDecision.refinedQuery}" to retrieve the relevant document context before answering.]`;
                } else if (routerDecision.route === 'ONLINE') {
                  systemPrompt += `\n\n[CONTEXT ROUTER GUIDANCE: The query intent was classified as ONLINE web search (${Math.round(routerDecision.confidence * 100)}% confidence). You MUST call tavilySearch with query "${routerDecision.refinedQuery}" to fetch current internet data before answering.]`;
                }
              }

              const result = streamText({
                model,
                system: systemPrompt,
                messages,
                tools,
                maxSteps: 10,
                onFinish: async (event) => {
                  finalGeneratedText = event.text;
                  const processingTime = (Date.now() - requestStartTime) / 1000;

                  // Log request to database for Analytics Dashboard
                  try {
                    const supabase = supabaseAdmin();
                    await supabase.from('mcppro_requests').insert({
                      document_url: routerDecision?.route || 'general-chat',
                      questions: [userQuery || 'Chat query'],
                      answers: [finalGeneratedText.slice(0, 500) || 'Assistant response'],
                      processing_time: processingTime,
                      document_metadata: {
                        model: selectedModel,
                        provider: provider || 'unknown',
                        route: routerDecision?.route || 'DIRECT',
                        routerConfidence: routerDecision?.confidence ?? 1.0,
                        routerReasoning: routerDecision?.reasoning || '',
                        toolCallsCount: event.toolCalls?.length || 0,
                      },
                      raw_response: {
                        finishReason: event.finishReason,
                        usage: event.usage,
                      },
                      success: true,
                      questions_count: 1,
                      chunks_processed: 0,
                      vector_store: routerDecision?.route === 'RAG' ? 'mcppro-documents' : 'none',
                      user_id: user.id,
                      user_email: user.email,
                      model: selectedModel,
                      route: routerDecision?.route || 'DIRECT',
                      router_confidence: routerDecision?.confidence ?? 1.0,
                      router_reasoning: routerDecision?.reasoning || 'Default direct evaluation',
                      tokens_used: (event.usage?.promptTokens || 0) + (event.usage?.completionTokens || 0),
                    });
                  } catch (logErr) {
                    console.warn('[chat/route] Analytics logging warning:', logErr);
                  }
                },
              });

              result.mergeIntoDataStream(dataStream);
            } catch (error) {
              console.error("[chat/route] Stream processing error:", error);
              const processingTime = (Date.now() - requestStartTime) / 1000;

              // Log failure
              try {
                const supabase = supabaseAdmin();
                await supabase.from('mcppro_requests').insert({
                  document_url: 'error',
                  questions: [userQuery || 'Error query'],
                  answers: [],
                  processing_time: processingTime,
                  document_metadata: { model: selectedModel },
                  raw_response: {},
                  success: false,
                  error_message: error instanceof Error ? error.message : String(error),
                  user_id: user.id,
                  user_email: user.email,
                  model: selectedModel,
                  route: 'DIRECT',
                });
              } catch {}

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

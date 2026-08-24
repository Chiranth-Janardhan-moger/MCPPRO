import { generateText } from 'ai';
import { getLanguageModel } from '@/app/chat/lib/ai/providers/providers';
import { getMCPProUnifiedSystemPrompt } from '@/app/chat/lib/ai/prompts/base-prompt';
import { getStaticTools } from '@/app/chat/lib/ai/tools/tool-registry';
import { mcpClientManager } from '@/app/chat/lib/ai/mcp-servers/mcp-client-manager';
import { logMCPProRequest, type ToolCall } from '@/lib/mcppro-agent-logger';
import { parseSimpleAnswers } from '@/lib/mcppro-agent-utils';
import { getUser } from '@/app/chat/hooks/get-user';
import { runWithRequestContext } from '@/lib/request-context';

export const maxDuration = 600;

const MAX_QUESTIONS = 25;
const MAX_TEXT_LENGTH = 8_000;

export async function POST(req: Request) {
  const startTime = Date.now();
  let url: string = '';
  let query: string = '';
  let questions: string[] = [];

  try {
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();

    url = typeof requestBody.url === 'string' ? requestBody.url : '';
    query = typeof requestBody.query === 'string' ? requestBody.query : '';
    questions = Array.isArray(requestBody.questions)
      ? requestBody.questions.filter((q: unknown) => typeof q === 'string')
      : [];
    const selectedModel =
      typeof requestBody.selectedModel === 'string'
        ? requestBody.selectedModel
        : undefined;

    if (url.length > MAX_TEXT_LENGTH || query.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `url/query must be <= ${MAX_TEXT_LENGTH} chars` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (
      questions.length === 0 ||
      questions.length > MAX_QUESTIONS ||
      questions.some((q: string) => q.length > MAX_TEXT_LENGTH)
    ) {
      return new Response(
        JSON.stringify({
          error: `Expected 1-${MAX_QUESTIONS} questions, each <= ${MAX_TEXT_LENGTH} chars`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tools = getStaticTools();

    try {
      await mcpClientManager.init();
      const mcpTools = await mcpClientManager.getAllTools();
      Object.assign(tools, mcpTools);
    } catch (error) {
      console.warn('MCP tools not available:', error);
    }

    const promptParts: string[] = [];

    if (url) {
      promptParts.push(`URL: ${url}`);
    }

    if (query) {
      promptParts.push(`Query: ${query}`);
    }

    promptParts.push(`Questions to answer:`);
    promptParts.push(questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));

    const prompt = promptParts.join('\n\n');

    return await runWithRequestContext(
      { userId: user.id, selectedModel },
      async () => {
        const result = await generateText({
          model: getLanguageModel(selectedModel),
          system: getMCPProUnifiedSystemPrompt(),
          prompt,
          tools,
          maxSteps: 15,
        });

        const toolCalls: ToolCall[] = [];
        if (result.steps) {
          for (const step of result.steps) {
            if (step.toolCalls) {
              for (const toolCall of step.toolCalls) {
                toolCalls.push({
                  toolName: toolCall.toolName,
                  input: toolCall.args,
                  output: null,
                  timestamp: new Date().toISOString(),
                });
              }
            }
            if (step.toolResults) {
              for (let i = 0; i < step.toolResults.length; i++) {
                const toolResult = step.toolResults[i] as any;
                if (toolCalls[toolCalls.length - step.toolResults.length + i]) {
                  toolCalls[
                    toolCalls.length - step.toolResults.length + i
                  ].output = toolResult?.result ?? null;
                }
              }
            }
          }
        }

        const answers = parseSimpleAnswers(result.text, questions.length);
        const processingTime = (Date.now() - startTime) / 1000;

        await logMCPProRequest({
          url,
          query,
          questions,
          answers,
          processingTime,
          success: true,
          toolCalls,
          rawResponse: {
            model: selectedModel || 'default',
            maxSteps: 15,
            toolsUsed: Object.keys(tools),
            resultText: result.text,
            stepsCount: result.steps?.length || 0,
          },
        });

        return new Response(JSON.stringify({ answers }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    );
  } catch (error: any) {
    console.error('[MCPPro API] Error:', error);

    const processingTime = (Date.now() - startTime) / 1000;
    await logMCPProRequest({
      url,
      query,
      questions,
      answers: [],
      processingTime,
      success: false,
      errorMessage: error.message || 'An unexpected error occurred.',
      rawResponse: {
        error: error.message,
      },
    });

    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

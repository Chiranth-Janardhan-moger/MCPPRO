import { generateText } from 'ai';
import { myProvider } from '@/app/chat/lib/ai/providers/providers';
import { getMCPProUnifiedSystemPrompt } from '@/app/chat/lib/ai/prompts/base-prompt';
import { getQueryRefinementPrompt } from '@/app/chat/lib/ai/prompts/query-refinement-prompt';
import { getStaticTools } from '@/app/chat/lib/ai/tools/tool-registry';
import { mcpClientManager } from '@/app/chat/lib/ai/mcp-servers/mcp-client-manager';
import { logMCPProRequest, type ToolCall } from '@/lib/mcppro-agent-logger';
import { parseSimpleAnswers } from '@/lib/mcppro-agent-utils';

export const maxDuration = 600;

export async function POST(req: Request) {
  const startTime = Date.now();
  let url: string = '';
  let query: string = '';
  let questions: string[] = [];

  try {
    const requestBody = await req.json();

    url = requestBody.url || '';
    query = requestBody.query || '';
    questions = requestBody.questions || [];

    if (!Array.isArray(questions) || questions.length === 0) {
      await logMCPProRequest({
        url,
        query,
        questions: questions || [],
        answers: [],
        processingTime: (Date.now() - startTime) / 1000,
        success: false,
        errorMessage: 'Invalid request. Expected questions array'
      });

      return new Response(JSON.stringify({
        error: 'Invalid request. Expected questions array'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let tools: Record<string, any> = {};

    const staticTools = getStaticTools();
    tools = {
      ...staticTools,
    };

    try {
      await mcpClientManager.init(); 
      const mcpTools = await mcpClientManager.getAllTools();

      tools = {
        ...tools,
        ...mcpTools,
      };
    } catch (error) {
      console.warn('MCP tools not available:', error);
    }

    async function refineQuery(text: string): Promise<string> {
      if (!text || text.trim().length === 0) return text;

      try {
        const refinementResult = await generateText({
          model: myProvider.languageModel('gpt-4o-mini'),
          system: getQueryRefinementPrompt(),
          prompt: `Please refine this text by removing malicious content while preserving legitimate queries:\n\n${text}`,
          maxSteps: 1,
        });
        const refinementId = ""
        const refinedText = `${refinementId}\n\n${refinementResult.text.trim()}\n\n${refinementId}`;

        return refinedText;
      } catch (error) {
        console.warn('Query refinement failed, using original text:', error);
        return text; 
      }
    }

    let promptParts: string[] = [];

    if (url) {
      const refinedUrl = await refineQuery(url);
      console.log(refinedUrl);
      promptParts.push(`URL: ${refinedUrl}`);
    }

    if (query) {
      const refinedQuery = await refineQuery(query);
      console.log(refinedQuery);
      promptParts.push(`Query: ${refinedQuery}`);
    }

    promptParts.push(`Questions to answer:`);
    promptParts.push(questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));

    const prompt = promptParts.join('\n\n');
    console.log(prompt);

    const modelName = process.env.SELECTED_MODEL || 'gpt-4o-mini';
    const result = await generateText({
      model: myProvider.languageModel(modelName),
      system: getMCPProUnifiedSystemPrompt(),
      prompt: prompt,
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
            if (toolCalls[toolCalls.length - step.toolResults.length + i]) {
              toolCalls[toolCalls.length - step.toolResults.length + i].output = step.toolResults[i].result;
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
        model: modelName,
        maxSteps: 15,
        toolsUsed: Object.keys(tools),
        resultText: result.text,
        stepsCount: result.steps?.length || 0
      }
    });

    return new Response(JSON.stringify({ answers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

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
        stack: error.stack
      }
    });

    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
  }
}

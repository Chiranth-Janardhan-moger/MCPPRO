import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getSystemSettings, getEffectiveApiKey } from '@/lib/services/admin-settings';

export type RouteType = 'RAG' | 'ONLINE' | 'DIRECT';

export interface RouterDecision {
  route: RouteType;
  confidence: number;
  reasoning: string;
  refinedQuery: string;
  latencyMs: number;
  modelUsed: string;
  providerUsed: string;
}

const ROUTER_SYSTEM_PROMPT = `You are an ultra-fast, intelligent Query Intent Classifier & Router.
Your objective is to determine the optimal execution path for a user's prompt by selecting one of three routes:

1. "RAG" (Retrieval-Augmented Generation / Knowledge Base Search):
   - Choose this when the user is asking about uploaded files, documents, internal corporate policies, reports, PDFs, spreadsheets, notes, guidelines, specs, documentation, or mentions "the file", "the document", "in our data", "contract", "handbook", or subjects related to the indexed knowledge base.

2. "ONLINE" (Real-Time Web Search via Tavily):
   - Choose this when the user requires live, real-time, or breaking internet information (e.g. current news, weather, stock prices, latest software versions, sports scores, live stats, current date events, or external URLs/websites).

3. "DIRECT" (Direct Frontier LLM):
   - Choose this for general coding, programming, debugging, algorithms, mathematics, creative writing, formatting, roleplay, general knowledge facts, logical reasoning, and general chat that requires no external or document lookup.

OUTPUT FORMAT:
You MUST return ONLY a strict JSON object with NO markdown formatting, NO backticks, and NO extra commentary.
{
  "route": "RAG" | "ONLINE" | "DIRECT",
  "confidence": <number between 0.1 and 1.0>,
  "reasoning": "<short 1-sentence reason>",
  "refined_query": "<clean search query if RAG/ONLINE, or original question>"
}`;

/**
 * Classify a user query using the configured cheaper router model.
 */
export async function classifyQueryContext(
  query: string,
  recentMessages: { role: string; content: string }[] = [],
  customApiKey?: string
): Promise<RouterDecision> {
  const startTime = Date.now();
  const settings = await getSystemSettings();
  const routing = settings.routing;

  // If routing is disabled, return direct immediately
  if (!routing.enabled) {
    return {
      route: 'DIRECT',
      confidence: 1.0,
      reasoning: 'Context routing is disabled by administrator.',
      refinedQuery: query,
      latencyMs: 0,
      modelUsed: 'none',
      providerUsed: 'none',
    };
  }

  const provider = routing.provider || 'google';
  let modelId = routing.model || 'gemini-2.5-flash';

  // Normalize model ID for Google provider
  if (provider === 'google') {
    if (modelId === 'gemini-3.5-flash-lite' || modelId === 'gemini-2.0-flash-lite') {
      modelId = 'gemini-2.5-flash';
    }
  }

  const apiKey = customApiKey || (await getEffectiveApiKey(provider, routing.api_key));

  if (!apiKey) {
    console.warn(`[context-router] No API key available for router provider '${provider}', defaulting to DIRECT`);
    return {
      route: 'DIRECT',
      confidence: 0.5,
      reasoning: `Router provider ${provider} has no API key configured.`,
      refinedQuery: query,
      latencyMs: Date.now() - startTime,
      modelUsed: modelId,
      providerUsed: provider,
    };
  }

  try {
    let languageModel: any;

    if (provider === 'google') {
      const client = createGoogleGenerativeAI({ apiKey });
      languageModel = client(modelId);
    } else if (provider === 'groq') {
      const client = createGroq({ apiKey });
      languageModel = client(modelId);
    } else if (provider === 'openai') {
      const client = createOpenAI({ apiKey });
      languageModel = client(modelId);
    } else if (provider === 'openrouter') {
      const client = createOpenRouter({ apiKey });
      languageModel = client.chat(modelId);
    } else {
      const client = createGoogleGenerativeAI({ apiKey });
      languageModel = client('gemini-2.5-flash');
    }

    const kbDescription = routing.system_knowledge_description
      ? `\nFixed Knowledge Base Context: ${routing.system_knowledge_description}`
      : '';

    // Take last 2 messages for quick conversational context
    const contextSnippet = recentMessages
      .slice(-2)
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const promptText = `${ROUTER_SYSTEM_PROMPT}${kbDescription}

${contextSnippet ? `Recent Conversation Context:\n${contextSnippet}\n` : ''}User Query: "${query.slice(0, 1000)}"

Decision JSON:`;

    // Resilient generation with 10s timeout
    const result = await Promise.race([
      generateText({
        model: languageModel,
        prompt: promptText,
        temperature: 0.0,
        maxTokens: 150,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Router timeout after 10s')), 10000)
      ),
    ]);

    const latencyMs = Date.now() - startTime;
    const text = result.text.trim().replace(/^```json\s*|\s*```$/g, '').trim();

    try {
      const parsed = JSON.parse(text);
      const route: RouteType =
        parsed.route === 'RAG' || parsed.route === 'ONLINE' || parsed.route === 'DIRECT'
          ? parsed.route
          : 'DIRECT';

      return {
        route,
        confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0.1), 1.0) : 0.9,
        reasoning: parsed.reasoning || `Classified as ${route}`,
        refinedQuery: parsed.refined_query || query,
        latencyMs,
        modelUsed: modelId,
        providerUsed: provider,
      };
    } catch {
      // Fallback regex if response wasn't strictly JSON
      let fallbackRoute: RouteType = 'DIRECT';
      if (/ONLINE/i.test(text)) fallbackRoute = 'ONLINE';
      else if (/RAG/i.test(text)) fallbackRoute = 'RAG';

      return {
        route: fallbackRoute,
        confidence: 0.75,
        reasoning: 'Extracted from router classification output.',
        refinedQuery: query,
        latencyMs,
        modelUsed: modelId,
        providerUsed: provider,
      };
    }
  } catch (err: any) {
    console.warn('[context-router] Router evaluation failed, fallback to DIRECT:', err.message);
    return {
      route: 'DIRECT',
      confidence: 0.5,
      reasoning: `Router failed: ${err.message}`,
      refinedQuery: query,
      latencyMs: Date.now() - startTime,
      modelUsed: modelId,
      providerUsed: provider,
    };
  }
}

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAnthropic } from '@ai-sdk/anthropic';


const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Return a dynamic value function that VoltAgent expects
export function getModelForAgent(selectedModel?: string) {
  return () => {
    const model = selectedModel || process.env.SELECTED_MODEL || 'gpt-4o-mini';
    
    switch (model) {
      case 'gpt-4o':
      case 'gpt-4o-mini':
      case 'o1':
      case 'o3-mini':
      case 'gpt-4.1-mini':
      case 'gpt-4.1':
        return openai(model);
      case 'gemini-2.0-flash':
      case 'gemini-2.0-pro-exp-02-05':
      case 'gemini-1.5-pro':
      case 'gemini-1.5-flash':
      case 'gemini-2.5-flash-preview-04-17':
      case 'gemini-2.5-pro':
        return google(model);
      case 'claude-3-7-sonnet-latest':
      case 'claude-3-5-sonnet-latest':
      case 'claude-3-5-haiku-latest':
        return anthropic(model);
      case 'grok-3-mini':
        return xai(model);
      case 'llama-3.3-70b-versatile':
        return groq(model);
      default:
        return openai('gpt-4o-mini');
    }
  };
}
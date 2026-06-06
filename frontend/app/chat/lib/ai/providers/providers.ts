import {
  customProvider,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from "@ai-sdk/groq";
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

export const models = [
  // OpenAI / ChatGPT
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'o1', label: 'OpenAI o1' },
  { value: 'o3-mini', label: 'OpenAI o3-mini' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  
  // Claude / Anthropic
  { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
  { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },

  // Google / Gemini
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash' },

  // Other Models
  { value: 'grok-3-mini', label: 'XAI Grok 3 Mini' },
  { value: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3' },
];

export const myProvider = customProvider({
  languageModels: {
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'gpt-4o': openai('gpt-4o'),
    'o1': openai('o1'),
    'o3-mini': openai('o3-mini'),
    'gpt-4.1-mini': openai('gpt-4.1-mini'),
    'gpt-4.1': openai('gpt-4.1'),
    
    'claude-3-7-sonnet-latest': anthropic('claude-3-7-sonnet-latest'),
    'claude-3-5-sonnet-latest': anthropic('claude-3-5-sonnet-latest'),
    'claude-3-5-haiku-latest': anthropic('claude-3-5-haiku-latest'),

    'gemini-2.0-flash': google('gemini-2.0-flash'),
    'gemini-2.0-pro-exp-02-05': google('gemini-2.0-pro-exp-02-05'),
    'gemini-1.5-pro': google('gemini-1.5-pro'),
    'gemini-1.5-flash': google('gemini-1.5-flash'),
    'gemini-2.5-flash-preview-04-17': google('gemini-2.5-flash-preview-04-17'),
    'gemini-2.5-pro': google('gemini-2.5-pro'),
    
    'grok-3-mini': xai('grok-3-mini'),
    'llama-3.3-70b-versatile': groq('llama-3.3-70b-versatile'),
  } as any,
  fallbackProvider: openai as any,
});
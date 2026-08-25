import { tavily } from "@tavily/core";
import { getEffectiveTavilyKey } from "@/lib/services/admin-settings";

export function getTavilyClient(customKey?: string) {
  const key = customKey || process.env.TAVILY_API_KEY || 'tvly_dummy_key_for_build';
  return tavily({ apiKey: key });
}

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY || 'tvly_dummy_key_for_build',
});

export default tvly;

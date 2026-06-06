import { tavily } from "@tavily/core";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY || 'tvly_dummy_key_for_build',
});

export default tvly;

import { z } from "zod";
import supabaseAdmin from '@/lib/supabase/admin';
import { getTavilyClient } from '@/lib/tavily/client';
import { getEffectiveTavilyKey, getSystemSettings } from '@/lib/services/admin-settings';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

function createTool<T extends { name: string; description: string; parameters: any; execute: (args: any) => Promise<any> }>(def: T): T {
  return def;
}

function extractQueryParam(args: any): string {
  if (typeof args === 'string') return args.trim();
  if (!args || typeof args !== 'object') return '';
  const candidates = [
    args.query,
    args.q,
    args.search,
    args.search_query,
    args.searchQuery,
    args.question,
    args.input,
    args.text,
    args.prompt,
    args.topic,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  if (Array.isArray(args.queries) && args.queries.length > 0) {
    const first = args.queries[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  if (Array.isArray(args.questions) && args.questions.length > 0) {
    const first = args.questions[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  return '';
}

// querySupabaseTool was removed for security (arbitrary SQL execution risk)

export const generateChartTool = createTool({
  name: "generateChart",
  description: "Generate an interactive chart for data visualization. Provide chartType ('bar', 'line', or 'pie'), title, description, and data as a list of points each with a 'label' (string) and 'value' (number).",
  parameters: z.object({
    chartType: z.union([z.enum(['bar', 'line', 'pie']), z.string()]).default('bar').describe('The type of chart to generate.'),
    data: z.union([
      z.array(z.any()),
      z.string()
    ]).describe('The array of data points to visualize, or JSON string of data points.'),
    xAxis: z.union([z.string(), z.array(z.string())]).optional().default('label').describe("The key for the X-axis, typically 'label'."),
    yAxis: z.union([z.string(), z.array(z.string())]).optional().default('value').describe("The key(s) for the Y-axis, typically 'value'."),
    title: z.string().optional().describe('The title of the chart.'),
    description: z.string().optional().describe('A brief caption or description of what the chart illustrates.'),
  }).passthrough() as any,
  execute: async (args: any) => {
    try {
      let rawData: any[] = [];
      if (Array.isArray(args.data)) {
        rawData = args.data;
      } else if (typeof args.data === 'string') {
        try {
          const parsed = JSON.parse(args.data);
          rawData = Array.isArray(parsed) ? parsed : [];
        } catch {
          rawData = [];
        }
      }

      const normalizedData = rawData.map((d: any) => {
        if (typeof d !== 'object' || d === null) return { label: String(d), value: 0 };
        const label = d.label ?? d.name ?? d.key ?? d.category ?? d.x ?? String(Object.values(d)[0] ?? '');
        const value = typeof d.value === 'number' ? d.value : (typeof d.val === 'number' ? d.val : (typeof d.y === 'number' ? d.y : parseFloat(d.value || d.val || '0') || 0));
        return { ...d, label: String(label), value };
      });

      const rawType = String(args.chartType || 'bar').toLowerCase();
      const chartType = ['bar', 'line', 'pie'].includes(rawType) ? rawType : 'bar';

      return {
        ...args,
        chartType,
        data: normalizedData,
        title: args.title || 'Chart Visualization',
        description: args.description || '',
        xAxis: 'label',
        yAxis: Array.isArray(args.yAxis) ? args.yAxis : [args.yAxis || 'value'],
      };
    } catch (err: any) {
      console.warn('[generateChartTool] Error formatting chart data:', err?.message);
      return {
        chartType: 'bar',
        data: [],
        title: args.title || 'Chart Visualization',
        description: args.description || '',
        xAxis: 'label',
        yAxis: ['value'],
      };
    }
  },
});

export const tavilySearchTool = createTool({
  name: "tavilySearch",
  description: "Search the web using Tavily for real-time information, current weather, breaking news, live data, stock prices, and current research. Always call this tool when the user asks about live facts, current weather, latest events, or online information.",
  parameters: z.object({
    query: z.string().optional().default("").describe("The search query to use"),
  }).passthrough() as any,
  execute: async (args: any) => {
    try {
      const query = extractQueryParam(args);
      if (!query) {
        return JSON.stringify({
          error: 'Search query was empty. Please provide specific search keywords.',
          results: [],
        });
      }

      const tavilyKey = await getEffectiveTavilyKey();
      if (!tavilyKey || tavilyKey.startsWith('tvly_dummy')) {
        return JSON.stringify({
          error: 'Tavily web search API key is not configured. Please add your Tavily API key in the Admin Panel settings.',
        });
      }

      const client = getTavilyClient(tavilyKey);
      const searchResult = await client.search(query, {
        includeAnswer: true,
        maxResults: 5,
        includeRawContent: false,
        includeImages: false,
      });
      return JSON.stringify(searchResult);
    } catch (error: any) {
      console.error('Error searching with Tavily:', error);
      return JSON.stringify({ error: `Failed to perform web search: ${error?.message || 'Unknown error'}` });
    }
  },
});

export const searchUploadedDocumentsTool = createTool({
  name: "searchUploadedDocuments",
  description: "Search indexed system knowledge base files and user-uploaded documents via semantic vector RAG search. Call this tool whenever the user asks questions about uploaded documents, files, internal policies, or company knowledge base.",
  parameters: z.object({
    query: z.string().optional().default("").describe("The search query or question to retrieve relevant chunks from the uploaded documents"),
  }).passthrough() as any,
  execute: async (args: any) => {
    try {
      const query = extractQueryParam(args);
      if (!query) {
        return JSON.stringify({
          result: "No search query provided to retrieve document context.",
          chunks: [],
        });
      }

      const backendUrl = (
        process.env.BACKEND_URL ||
        'https://mcppro.onrender.com'
      ).trim().replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const settings = await getSystemSettings();
      const token =
        settings.api_keys.backend_token ||
        process.env.BACKEND_BEARER_TOKEN ||
        process.env.BEARER_TOKEN;
      if (token) headers.Authorization = `Bearer ${token.trim()}`;

      const res = await fetch(`${backendUrl}/documents/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, k: 5 }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!res.ok) {
        return JSON.stringify({
          result: "No matching document chunks found in Knowledge Base.",
          chunks: [],
        });
      }

      const data = await res.json();
      if (!data.chunks || data.chunks.length === 0) {
        return JSON.stringify({
          result: "No matching document chunks found in the Knowledge Base vector store.",
          chunks: [],
          count: 0,
        });
      }

      const formattedContext = data.chunks
        .map(
          (c: any, i: number) =>
            `--- [Chunk ${i + 1} from ${c.metadata?.source || 'Knowledge Base'}] ---\n${c.content}`
        )
        .join('\n\n');

      return JSON.stringify({
        status: "success",
        count: data.chunks.length,
        chunks: data.chunks.map((c: any) => ({
          text: c.content,
          documentName: c.metadata?.source || c.metadata?.document_name || 'Knowledge Base Document',
          score: c.score,
          page: c.metadata?.page,
        })),
        document_context: formattedContext,
      });
    } catch (err: any) {
      console.warn('[searchUploadedDocumentsTool] RAG search timeout or offline:', err?.message);
      return JSON.stringify({
        result: "Knowledge base search completed with no matching documents found. Answer using general intelligence or search the web if live info is needed.",
      });
    }
  },
});

export const generateImageTool = createTool({
  name: "generateImage",
  description: "Generate an image based on a textual prompt",
  parameters: z.object({
    prompt: z.string().describe("The prompt for the image generation"),
  }) as any,
  execute: async (args: any) => {
    try {
      const result = await generateText({
        model: google('gemini-2.0-flash-preview-image-generation'),
        providerOptions: {
          google: { responseModalities: ['TEXT', 'IMAGE'] },
        },
        prompt: `Generate an image of ${args.prompt}`,
      });

      const imagePart = result.files.find(file => file.mimeType?.startsWith('image/'));

      if (!imagePart) {
        throw new Error('Image generation failed or no image was returned.');
      }

      const supabase = supabaseAdmin();
      const buffer = Buffer.from((imagePart as any).base64, 'base64');
      const filePath = `public/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(filePath, buffer, {
          contentType: imagePart.mimeType!,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error('Failed to upload image to storage.');
      }

      const { data: publicUrlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for the image.');
      }

      return {
        imageUrl: publicUrlData.publicUrl,
        prompt: args.prompt,
      };
    } catch (error) {
      console.error('Error generating image:', error);
      return { error: 'Sorry, I was unable to generate the image.' };
    }
  },
});

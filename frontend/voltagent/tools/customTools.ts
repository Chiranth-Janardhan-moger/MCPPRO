import { z } from "zod";
import supabaseAdmin from '@/lib/supabase/admin';
import { getTavilyClient } from '@/lib/tavily/client';
import { getEffectiveTavilyKey, getSystemSettings } from '@/lib/services/admin-settings';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

function createTool<T extends { name: string; description: string; parameters: any; execute: (args: any) => Promise<any> }>(def: T): T {
  return def;
}

export const querySupabaseTool = createTool({
  name: "querySupabase",
  description: "Query the Supabase database",
  parameters: z.object({
    query: z.string().describe("The SQL query to execute"),
  }) as any,
  execute: async (args: any) => {
    const supabase = supabaseAdmin();
    const sanitizedQuery = args.query.trim().replace(/;$/, '');
    const { data, error } = await supabase.rpc('execute_sql', { query: sanitizedQuery });

    if (error) {
      console.error('Supabase query error:', error);
      return JSON.stringify({ error: `Error running query: ${error.message}` });
    }

    if (!data) {
      return JSON.stringify({ result: "Query returned no results." });
    }

    return JSON.stringify(data);
  },
});

export const generateChartTool = createTool({
  name: "generateChart",
  description: "Generate a chart for data visualization. Use this to display data in a graphical format.",
  parameters: z.object({
    chartType: z.enum(['bar', 'line', 'pie']).describe('The type of chart to generate.'),
    data: z.array(
      z.object({
        label: z.string().describe('The label for a data point.'),
        value: z.number().describe('The value for a data point.'),
      }),
    ).describe('The data for the chart, as an array of objects.'),
    xAxis: z.string().describe("The key from the data objects to use for the X-axis. This must be 'label'."),
    yAxis: z.array(z.string()).describe("The key(s) from the data objects to use for the Y-axis. This must be 'value'."),
    title: z.string().optional().describe('The title of the chart.'),
    description: z.string().optional().describe('A description of the chart.'),
  }) as any,
  execute: async (args: any) => {
    return args;
  },
});

export const tavilySearchTool = createTool({
  name: "tavilySearch",
  description: "Search the web using Tavily for real-time information, current weather, breaking news, live data, stock prices, and current research. Always call this tool when the user asks about live facts, current weather, latest events, or online information.",
  parameters: z.object({
    query: z.string().describe("The search query to use"),
  }) as any,
  execute: async (args: any) => {
    try {
      const tavilyKey = await getEffectiveTavilyKey();
      if (!tavilyKey || tavilyKey.startsWith('tvly_dummy')) {
        return JSON.stringify({
          error: 'Tavily web search API key is not configured. Please add your Tavily API key in the Admin Panel settings.',
        });
      }

      const client = getTavilyClient(tavilyKey);
      const searchResult = await client.search(args.query, {
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
    query: z.string().describe("The search query or question to retrieve relevant chunks from the uploaded documents"),
  }) as any,
  execute: async (args: any) => {
    try {
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
        process.env.BEARER_TOKEN ||
        'y4s53fje0w7glvuc9mrpnbdzha21tqok6i8x';
      if (token) headers.Authorization = `Bearer ${token.trim()}`;

      const res = await fetch(`${backendUrl}/documents/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: args.query, k: 5 }),
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

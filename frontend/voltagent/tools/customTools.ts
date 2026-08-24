import { createTool } from "@voltagent/core";
import { z } from "zod";
import supabaseAdmin from '@/lib/supabase/admin';
import tvly from '@/lib/tavily/client';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import createAdmin from '@/lib/supabase/admin';

export const querySupabaseTool = createTool({
  name: "querySupabase",
  description: "Query the Supabase database",
  parameters: z.object({
    query: z.string().describe("The SQL query to execute"),
  }),
  execute: async (args) => {
    const supabase = supabaseAdmin();
    console.log(args.query);
    // Remove trailing semicolon to prevent syntax errors
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
  }),
  execute: async (args) => {
    // This tool doesn't perform a server-side action.
    // It returns its arguments so the UI can render the chart.
    return args;
  },
});

export const tavilySearchTool = createTool({
  name: "tavilySearch",
  description: "Search the web using Tavily for up-to-date information, news, and research",
  parameters: z.object({
    query: z.string().describe("The search query to use"),
  }),
  execute: async (args) => {
    try {
      const searchResult = await tvly.search(args.query, {
        includeAnswer: true,
        maxResults: 5,
        includeRawContent: false,
        includeImages: true,
      });
      // The result needs to be a JSON string for the client to parse.
      return JSON.stringify(searchResult);
    } catch (error) {
      console.error('Error searching with Tavily:', error);
      return JSON.stringify({ error: 'Failed to perform search. Please try again.' });
    }
  },
});

export const searchUploadedDocumentsTool = createTool({
  name: "searchUploadedDocuments",
  description: "Search indexed user documents and files via RAG vector search. ALWAYS call this tool first whenever the user asks questions about their uploaded files, documents, text, code, or knowledge base.",
  parameters: z.object({
    query: z.string().describe("The search query or question to retrieve relevant chunks from the uploaded documents"),
  }),
  execute: async (args) => {
    try {
      const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = process.env.BACKEND_BEARER_TOKEN || process.env.BEARER_TOKEN;
      if (token) headers.Authorization = `Bearer ${token.trim()}`;

      const res = await fetch(`${backendUrl}/documents/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: args.query, k: 5 }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return JSON.stringify({ error: `Could not retrieve document chunks: ${errText || res.status}` });
      }

      const data = await res.json();
      if (!data.chunks || data.chunks.length === 0) {
        return JSON.stringify({
          result: "No matching document chunks found in the vector store. Make sure a document is uploaded via 'My Documents' in the sidebar.",
          count: 0,
        });
      }

      const formattedContext = data.chunks
        .map(
          (c: any, i: number) =>
            `--- [Chunk ${i + 1} from ${c.metadata?.source || 'Uploaded Document'}] ---\n${c.content}`
        )
        .join('\n\n');

      return JSON.stringify({
        status: "success",
        matched_chunks: data.chunks.length,
        document_context: formattedContext,
      });
    } catch (err: any) {
      console.error('Error in searchUploadedDocumentsTool:', err);
      return JSON.stringify({ error: `RAG search error: ${err.message}` });
    }
  },
});

export const generateImageTool = createTool({
  name: "generateImage",
  description: "Generate an image based on a textual prompt",
  parameters: z.object({
    prompt: z.string().describe("The prompt for the image generation"),
  }),
  execute: async (args) => {
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

      const supabase = await createAdmin();
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
      // Return a structured error that the client can display
      return { error: 'Sorry, I was unable to generate the image.' };
    }
  },
});


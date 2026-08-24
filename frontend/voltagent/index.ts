import { createRequire } from 'node:module';
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { getModelForAgent } from './utils/modelProvider';
import { getMCPTools } from "./tools/mcpTools";
import { getGeneralAgentPrompt } from '@/app/chat/lib/ai/prompts/general-agent';
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { tavilySearchTool, querySupabaseTool, generateChartTool, generateImageTool } from "./tools/customTools";

const isBuildPhase =
  process.env.CI === 'true' ||
  process.env.NEXT_PHASE === 'phase-production-build';

/**
 * High-risk tools (arbitrary code execution, arbitrary SQL) are opt-in via
 * ENABLE_DANGEROUS_TOOLS=true. They are never registered by default.
 */
const dangerousToolsEnabled = process.env.ENABLE_DANGEROUS_TOOLS === 'true';

function convertAIToolToVoltAgent(name: string, aiTool: any) {
  return createTool({
    name,
    description: aiTool.description || `Tool: ${name}`,
    parameters: aiTool.parameters,
    execute: async (args) => {
      try {
        const result = await aiTool.execute(args);
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (error: any) {
        console.error(`Error executing tool ${name}:`, error);
        return JSON.stringify({ error: `Tool ${name} failed: ${error?.message || 'Unknown error'}` });
      }
    }
  });
}

async function getAllTools() {
  const tools: any[] = [];

  // customTools are already VoltAgent createTool objects — pass directly.
  tools.push(tavilySearchTool, generateChartTool, generateImageTool);

  if (dangerousToolsEnabled && !isBuildPhase) {
    // Runtime-only require with opaque specifiers: keeps spawn/exec code out
    // of the bundler graph entirely. Native require cannot resolve the '@/'
    // tsconfig alias, so use explicit relative paths; .ts extension because
    // these modules only exist as sources (dev opt-in feature).
    const cleanUrl = import.meta.url.split('?')[0];
    const runtimeRequire = createRequire(cleanUrl);
    const toolsDir = '../app/chat/lib/ai/tools/';
    const toolSpecifiers: Record<string, string> = {
      js: `${toolsDir}javascript-tool.ts`,
      file: `${toolsDir}create-code-file.ts`,
    };
    tools.push(convertAIToolToVoltAgent('javaScriptTool', runtimeRequire(toolSpecifiers.js).javaScriptTool));
    tools.push(convertAIToolToVoltAgent('createCodeFileTool', runtimeRequire(toolSpecifiers.file).createCodeFileTool));
    tools.push(querySupabaseTool);
  }

  if (!isBuildPhase) {
    try {
      const mcpTools = await getMCPTools();
      Object.entries(mcpTools).forEach(([name, tool]) => {
        if (tool && typeof tool === 'object' && tool.parameters && tool.execute) {
          tools.push(convertAIToolToVoltAgent(name, tool));
        }
      });
    } catch (error) {
      console.warn('MCP tools not available:', error);
    }
  }

  return tools;
}

const agent = new Agent({
  name: "MCPPro",
  instructions: getGeneralAgentPrompt(),
  llm: new VercelAIProvider(),
  model: getModelForAgent(),
  tools: await getAllTools(),
  maxSteps: 20
});

export { agent };

// Only run the VoltAgent HTTP server for a real dev/prod server process,
// never during `next build` module evaluation.
if (!isBuildPhase && process.env.NEXT_RUNTIME === 'nodejs') {
  new VoltAgent({
    agents: {
      agent: agent,
    },
  });
}

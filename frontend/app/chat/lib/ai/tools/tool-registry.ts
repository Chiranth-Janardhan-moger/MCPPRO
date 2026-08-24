import type { Tool } from 'ai';
import { createRequire } from 'node:module';

/**
 * Static (non-MCP) tools available to the agent run route.
 *
 * The code-execution and file-write tools are HIGH RISK: they run arbitrary
 * Node/PowerShell on the server. They are only registered when
 * ENABLE_DANGEROUS_TOOLS=true is set explicitly by the operator.
 *
 * They are loaded via a runtime require (NOT bundled): this keeps
 * child_process/spawn out of the Turbopack build graph and guarantees the
 * code paths cannot ship unless an operator explicitly opts in.
 */
export function getStaticTools(): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  if (process.env.ENABLE_DANGEROUS_TOOLS === 'true') {
    // Runtime-only require with opaque specifiers: keeps spawn/exec code out
    // of the bundler graph entirely. Resolution notes:
    // - strip any HMR/vitest query from import.meta.url before creating the
    //   require fn, or sibling lookups break
    // - explicit .ts extension: these modules only exist as sources (dev /
    //   test); they are intentionally not bundled into production builds
    const cleanUrl = import.meta.url.split('?')[0];
    const runtimeRequire = createRequire(cleanUrl);
    const specifiers: Record<string, string> = {
      js: './javascript-tool.ts',
      file: './create-code-file.ts',
    };
    tools.javaScriptTool =
      runtimeRequire(specifiers.js).javaScriptTool;
    tools.createCodeFileTool =
      runtimeRequire(specifiers.file).createCodeFileTool;
  }

  return tools;
}

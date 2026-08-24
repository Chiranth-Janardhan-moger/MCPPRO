import type { LanguageModelV1 } from 'ai';
import { getLanguageModel } from '@/app/chat/lib/ai/providers/providers';
import { getRequestContext } from '@/lib/request-context';

/**
 * VoltAgent expects either a static model or a dynamic value function that is
 * evaluated at call time. We use the function form and read the model from the
 * AsyncLocalStorage request context, which makes per-user/per-request model
 * selection race-free (no process.env mutation).
 */
export function getModelForAgent(selectedModel?: string) {
  return (): LanguageModelV1 => {
    const fromContext = getRequestContext().selectedModel;
    return getLanguageModel(fromContext || selectedModel);
  };
}

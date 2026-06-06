import supabaseAdmin from '@/lib/supabase/admin';

export interface ToolCall {
  toolName: string;
  input: any;
  output: any;
  timestamp: string;
  executionTime?: number;
}

export interface MaxAgentLogEntry {
  url?: string;
  query?: string;
  questions: string[];
  answers: string[];
  processingTime: number;
  success: boolean;
  errorMessage?: string;
  rawResponse?: any;
  toolCalls?: ToolCall[];
}

export async function logMaxAgentRequest(logEntry: MaxAgentLogEntry): Promise<void> {
  try {
    const supabase = supabaseAdmin(); // Uses admin client to bypass RLS issues

    const dbLogEntry = {
      timestamp: new Date().toISOString(),
      document_url: logEntry.url || logEntry.query || 'max-agent-challenge',
      questions: logEntry.questions,
      answers: logEntry.answers,
      processing_time: logEntry.processingTime,
      document_metadata: {
        url: logEntry.url,
        query: logEntry.query,
        timestamp: new Date().toISOString(),
        tool_type: 'max_agent_unified'
      },
      raw_response: {
        ...logEntry.rawResponse || {},
        toolCalls: logEntry.toolCalls || []
      },
      success: logEntry.success,
      error_message: logEntry.errorMessage,
      questions_count: logEntry.questions.length,
      chunks_processed: 0,
      vector_store: 'max_agent_unified'
    };

    const { error } = await supabase
      .from('max_agent_requests') // Insert into renamed table
      .insert(dbLogEntry);

    if (error) {
      console.error('Error logging to Supabase:', error);
    } else {
      console.log('Successfully logged request to Supabase');
    }
  } catch (error) {
    console.error('Failed to log to Supabase:', error);
  }
}

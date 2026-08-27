"use client";

import { Message } from "ai";
import { memo } from "react";
import { PreviewMessage, ThinkingMessage } from "./message";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { ToolResultDisplay } from "./tool-result-display";

interface MessagesProps {
  isLoading: boolean;
  messages: Message[];
}

function PureMessages({
  isLoading,
  messages,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom(messages);

  return (
    <div
      ref={messagesContainerRef as React.RefObject<HTMLDivElement>}
      className="flex flex-col min-w-0 gap-6 flex-1 pt-4"
    >
      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id || index}
          message={message}
          isLoading={isLoading && index === messages.length - 1}
        />
      ))}

      {isLoading &&
        (messages[messages.length - 1]?.role === 'user' ||
          (messages[messages.length - 1]?.role === 'assistant' &&
            !messages[messages.length - 1]?.content)) && <ThinkingMessage />}

      <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
}

export const Messages = memo(PureMessages);
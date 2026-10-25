import { useEffect, useRef, type RefObject } from 'react';
import { type Message } from 'ai';

export function useScrollToBottom<T extends HTMLElement>(messages: Message[]): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const isAutoScrollEnabled = useRef(true);

  // Monitor user manual scrolling to prevent fighting user scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Re-enable autoscroll if user is within 120px of bottom
      isAutoScrollEnabled.current = distanceFromBottom < 120;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Track latest message changes to scroll during token streaming
  const lastMessage = messages[messages.length - 1];
  const lastContentLength = typeof lastMessage?.content === 'string' ? lastMessage.content.length : 0;
  const toolInvocationsCount = lastMessage?.toolInvocations?.length || 0;

  useEffect(() => {
    const end = endRef.current;
    if (end && isAutoScrollEnabled.current) {
      end.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, lastContentLength, toolInvocationsCount]);

  return [containerRef, endRef] as [RefObject<T>, RefObject<T>];
}

import React from "react";
import { cn } from "@/lib/utils";

interface MentionRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders comment content with highlighted mentions
 * Parses mentions in the format @[username](userId) and renders them as badges
 * FIXED: Added React.memo for performance optimization
 */
export const MentionRenderer = React.memo(function MentionRenderer({ content, className }: MentionRendererProps) {
  // Regular expression to match mentions: @[username](userId)
  const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;

  // Split content into text and mention parts
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const [fullMatch, username] = match;
    const matchIndex = match.index;

    // Add text before the mention
    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex, matchIndex)}
        </span>
      );
    }

    // Add the mention as a highlighted badge
    parts.push(
      <span
        key={`mention-${matchIndex}`}
        className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-sm"
        title={`Mentioned user: ${username}`}
      >
        @{username}
      </span>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text after the last mention
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>
    );
  }

  return (
    <div className={cn("text-sm whitespace-pre-wrap", className)}>
      {parts.length > 0 ? parts : content}
    </div>
  );
});

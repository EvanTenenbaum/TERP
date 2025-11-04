import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: { key: string; preventDefault: () => void }) => void;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  onKeyDown,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [_mentionQuery, _setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<{ selectionStart?: number | null; selectionEnd?: number | null; value?: string; focus?: () => void } | null>(null);

  // Fetch users for mentions - using empty array for now since endpoint doesn't exist yet
  const _users: { id: number; username: string; email?: string }[] = [];
  const users = _users;

  useEffect(() => {
    // Detect @ mentions
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // Check if there's a space after @
      if (!textAfterAt.includes(" ") && textAfterAt.length > 0) {
        _setMentionQuery(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else if (textAfterAt.length === 0) {
        _setMentionQuery("");
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  const insertMention = (username: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    const newValue =
      value.substring(0, lastAtSymbol) +
      `@${username} ` +
      textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtSymbol + username.length + 2;
      const ref = textareaRef.current as { setSelectionRange?: (start: number, end: number) => void } | null;
      ref?.setSelectionRange?.(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (showSuggestions && users.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(users[selectedIndex].username);
        return;
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }

    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {/* Mention Suggestions */}
      {showSuggestions && users.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
          {users.map((user: { id: number; username: string; email?: string }, index: number) => (
            <button
              key={user.id}
              className={cn(
                "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => insertMention(user.username)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">{user.username}</div>
              {user.email && (
                <div className="text-xs text-muted-foreground">{user.email}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

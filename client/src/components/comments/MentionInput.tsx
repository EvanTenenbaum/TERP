import React, { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

interface User {
  id: number;
  name: string | null;
  email: string | null;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  onKeyDown,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  // Use comments-scoped mention endpoint so any commenter can see the picker
  // without requiring the stricter `users:read` permission.
  const { data: allUsers = [] } = trpc.comments.listMentionableUsers.useQuery();

  // Filter users based on mention query
  const filteredUsers = allUsers.filter((user: User) => {
    if (!mentionQuery) return true;
    const query = mentionQuery.toLowerCase();
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const detectMention = useCallback(
    (nextValue: string, cursorPosition: number) => {
      const textBeforeCursor = nextValue.substring(0, cursorPosition);
      const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

      if (lastAtSymbol === -1) {
        setShowSuggestions(false);
        return;
      }

      // @ must be at the start or preceded by whitespace to count as a mention trigger
      const charBefore =
        lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : "";
      if (charBefore && !/\s/.test(charBefore)) {
        setShowSuggestions(false);
        return;
      }

      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
        setShowSuggestions(false);
        return;
      }

      setMentionQuery(textAfterAt);
      setShowSuggestions(true);
      setSelectedIndex(0);
    },
    []
  );

  useEffect(() => {
    const cursorPosition = textareaRef.current?.selectionStart ?? value.length;
    detectMention(value, cursorPosition);
  }, [value, detectMention]);

  const insertMention = (user: User) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    // Format mention as @[username](userId) for backend parsing
    const userName = user.name || user.email || "Unknown";
    const mentionText = `@[${userName}](${user.id})`;

    const newValue =
      value.substring(0, lastAtSymbol) + mentionText + " " + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Focus back on textarea and position cursor after mention
    // FIXED: Use ref to track timeout for proper cleanup
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtSymbol + mentionText.length + 1;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          prev => (prev - 1 + filteredUsers.length) % filteredUsers.length
        );
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Call parent onKeyDown if provided
    onKeyDown?.(e);
  };

  const handleSelectionChange = () => {
    const el = textareaRef.current;
    if (!el) return;
    detectMention(el.value, el.selectionStart ?? el.value.length);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        className={className}
      />

      {/* Mention Suggestions */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
          {filteredUsers.map((user: User, index: number) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">{user.name || "Unknown"}</div>
              {user.email && (
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && mentionQuery && filteredUsers.length === 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-md shadow-lg p-3 z-50">
          <div className="text-sm text-muted-foreground">
            No users found matching "{mentionQuery}"
          </div>
        </div>
      )}
    </div>
  );
}

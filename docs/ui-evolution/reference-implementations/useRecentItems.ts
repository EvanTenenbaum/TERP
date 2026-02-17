/**
 * useRecentItems — Track recently viewed items for Command Palette
 * Part of TERP UI Evolution Wave 2
 *
 * Stores recently viewed orders, clients, quotes, etc. in localStorage.
 * LRU eviction at 20 items. Deduplicates by type+id.
 *
 * Usage:
 * ```tsx
 * const { recentItems, addRecentItem, clearRecentItems } = useRecentItems();
 *
 * // When user opens an item in the inspector:
 * addRecentItem("order", "ORD-2024-0142", "Becker Berlin — $12,450");
 *
 * // In CommandPalette, render recent items:
 * recentItems.map(item => <CommandItem key={item.key} ... />)
 * ```
 */
import { useState, useCallback } from "react";

const STORAGE_KEY = "terp-recent-items";
const MAX_ITEMS = 20;

export interface RecentItem {
  type: "order" | "client" | "quote" | "invoice" | "batch" | "product" | "vendor" | "purchase-order";
  id: string;
  label: string;
  timestamp: number;
  /** Unique key for deduplication: `${type}:${id}` */
  key: string;
}

function loadItems(): RecentItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveItems(items: RecentItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>(loadItems);

  const addRecentItem = useCallback(
    (type: RecentItem["type"], id: string, label: string) => {
      setRecentItems((prev) => {
        const key = `${type}:${id}`;
        // Remove existing entry for this item (dedup)
        const filtered = prev.filter((item) => item.key !== key);
        // Prepend new entry (most recent first)
        const updated = [
          { type, id, label, timestamp: Date.now(), key },
          ...filtered,
        ].slice(0, MAX_ITEMS); // LRU eviction
        saveItems(updated);
        return updated;
      });
    },
    []
  );

  const clearRecentItems = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentItems([]);
  }, []);

  return { recentItems, addRecentItem, clearRecentItems };
}

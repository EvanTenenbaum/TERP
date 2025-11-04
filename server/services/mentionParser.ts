/**
 * Mention Parser Service
 * Handles parsing and formatting of @mentions in comments
 */

/**
 * Parse @mentions from comment content
 * Extracts user IDs from mentions in format @[username](userId)
 *
 * @param content - The comment content to parse
 * @returns Array of unique user IDs mentioned
 */
export function parseMentions(content: string): number[] {
  if (!content) return [];

  // Match pattern: @[username](userId)
  const mentionPattern = /@\[([^\]]+)\]\((\d+)\)/g;

  const userIds = new Set<number>();
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    const userId = parseInt(match[2], 10);
    if (!isNaN(userId)) {
      userIds.add(userId);
    }
  }

  return Array.from(userIds);
}

/**
 * Format a mention for insertion into comment content
 * Creates mention in format @[username](userId)
 *
 * @param userName - The name of the user being mentioned
 * @param userId - The ID of the user being mentioned
 * @returns Formatted mention string
 */
export function formatMention(userName: string, userId: number): string {
  return `@[${userName}](${userId})`;
}

/**
 * Extract plain text from comment content (remove mention formatting)
 * Converts @[username](userId) to @username
 *
 * @param content - The comment content with formatted mentions
 * @returns Plain text version with simple @username mentions
 */
export function extractPlainText(content: string): string {
  if (!content) return "";

  // Replace @[username](userId) with @username
  return content.replace(/@\[([^\]]+)\]\(\d+\)/g, "@$1");
}

/**
 * Validate mention format
 * Checks if a string is a valid mention format
 *
 * @param mention - The mention string to validate
 * @returns True if valid mention format, false otherwise
 */
export function isValidMention(mention: string): boolean {
  const mentionPattern = /^@\[([^\]]+)\]\((\d+)\)$/;
  return mentionPattern.test(mention);
}

/**
 * Replace user IDs in content with formatted mentions
 * Useful for converting simple @userId to @[username](userId)
 *
 * @param content - The content with simple @userId mentions
 * @param userMap - Map of userId to userName
 * @returns Content with formatted mentions
 */
export function replaceMentionsWithFormat(
  content: string,
  userMap: Map<number, string>
): string {
  if (!content) return "";

  // Match pattern: @userId (simple format)
  const simplePattern = /@(\d+)/g;

  return content.replace(simplePattern, (match, userId) => {
    const id = parseInt(userId, 10);
    const userName = userMap.get(id);

    if (userName) {
      return formatMention(userName, id);
    }

    return match; // Keep original if user not found
  });
}

/**
 * Get all unique user IDs from multiple comments
 *
 * @param comments - Array of comment contents
 * @returns Array of unique user IDs mentioned across all comments
 */
export function getAllMentionedUsers(comments: string[]): number[] {
  const allUserIds = new Set<number>();

  for (const comment of comments) {
    const userIds = parseMentions(comment);
    userIds.forEach(id => allUserIds.add(id));
  }

  return Array.from(allUserIds);
}

/**
 * Check if content contains any mentions
 *
 * @param content - The content to check
 * @returns True if content contains at least one mention
 */
export function hasMentions(content: string): boolean {
  if (!content) return false;

  const mentionPattern = /@\[([^\]]+)\]\((\d+)\)/;
  return mentionPattern.test(content);
}

/**
 * Count mentions in content
 *
 * @param content - The content to analyze
 * @returns Number of mentions in the content
 */
export function countMentions(content: string): number {
  if (!content) return 0;

  const userIds = parseMentions(content);
  return userIds.length;
}

/**
 * Sanitize mention content to prevent XSS
 * Removes any HTML tags from username
 *
 * @param userName - The username to sanitize
 * @returns Sanitized username
 */
export function sanitizeUserName(userName: string): string {
  if (!userName) return "";

  // Remove HTML tags
  return userName.replace(/<[^>]*>/g, "");
}

/**
 * Create mention from user data with sanitization
 *
 * @param userName - The username (will be sanitized)
 * @param userId - The user ID
 * @returns Formatted and sanitized mention
 */
export function createSafeMention(userName: string, userId: number): string {
  const sanitizedName = sanitizeUserName(userName);
  return formatMention(sanitizedName, userId);
}

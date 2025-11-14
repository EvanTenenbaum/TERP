/**
 * Mention Parser Service Tests
 * Tests for parsing and formatting @mentions in comments
 */

import { describe, it, expect } from "vitest";
import * as mentionParser from "./mentionParser";

describe("Mention Parser Service", () => {
  describe("parseMentions", () => {
    it("should parse single mention", () => {
      const content = "Hello @[John Doe](123), how are you?";
      const userIds = mentionParser.parseMentions(content);

      expect(userIds).toEqual([123]);
    });

    it("should parse multiple mentions", () => {
      const content = "Hey @[Alice](1) and @[Bob](2), check this out!";
      const userIds = mentionParser.parseMentions(content);

      expect(userIds).toEqual([1, 2]);
    });

    it("should handle duplicate mentions", () => {
      const content = "@[Alice](1) and @[Alice](1) are here";
      const userIds = mentionParser.parseMentions(content);

      expect(userIds).toEqual([1]);
    });

    it("should return empty array for no mentions", () => {
      const content = "No mentions here";
      const userIds = mentionParser.parseMentions(content);

      expect(userIds).toEqual([]);
    });

    it("should handle empty content", () => {
      const userIds = mentionParser.parseMentions("");

      expect(userIds).toEqual([]);
    });
  });

  describe("formatMention", () => {
    it("should format a mention correctly", () => {
      const mention = mentionParser.formatMention("John Doe", 123);

      expect(mention).toBe("@[John Doe](123)");
    });
  });

  describe("extractPlainText", () => {
    it("should extract plain text from mentions", () => {
      const content = "Hello @[John Doe](123), how are you?";
      const plainText = mentionParser.extractPlainText(content);

      expect(plainText).toBe("Hello @John Doe, how are you?");
    });

    it("should handle multiple mentions", () => {
      const content = "@[Alice](1) and @[Bob](2) are here";
      const plainText = mentionParser.extractPlainText(content);

      expect(plainText).toBe("@Alice and @Bob are here");
    });

    it("should handle content without mentions", () => {
      const content = "No mentions here";
      const plainText = mentionParser.extractPlainText(content);

      expect(plainText).toBe("No mentions here");
    });
  });

  describe("isValidMention", () => {
    it("should validate correct mention format", () => {
      const isValid = mentionParser.isValidMention("@[John Doe](123)");

      expect(isValid).toBe(true);
    });

    it("should reject invalid mention format", () => {
      expect(mentionParser.isValidMention("@John Doe")).toBe(false);
      expect(mentionParser.isValidMention("@[John Doe]")).toBe(false);
      expect(mentionParser.isValidMention("@(123)")).toBe(false);
    });
  });

  describe("replaceMentionsWithFormat", () => {
    it("should replace simple mentions with formatted ones", () => {
      const content = "Hello @123, how are you?";
      const userMap = new Map([[123, "John Doe"]]);
      const formatted = mentionParser.replaceMentionsWithFormat(
        content,
        userMap
      );

      expect(formatted).toBe("Hello @[John Doe](123), how are you?");
    });

    it("should handle multiple mentions", () => {
      const content = "@1 and @2 are here";
      const userMap = new Map([
        [1, "Alice"],
        [2, "Bob"],
      ]);
      const formatted = mentionParser.replaceMentionsWithFormat(
        content,
        userMap
      );

      expect(formatted).toBe("@[Alice](1) and @[Bob](2) are here");
    });

    it("should keep original if user not found", () => {
      const content = "Hello @123";
      const userMap = new Map();
      const formatted = mentionParser.replaceMentionsWithFormat(
        content,
        userMap
      );

      expect(formatted).toBe("Hello @123");
    });
  });

  describe("getAllMentionedUsers", () => {
    it("should get all unique user IDs from multiple comments", () => {
      const comments = [
        "Hello @[Alice](1)",
        "Hi @[Bob](2) and @[Alice](1)",
        "Hey @[Charlie](3)",
      ];
      const userIds = mentionParser.getAllMentionedUsers(comments);

      expect(userIds.sort()).toEqual([1, 2, 3]);
    });
  });

  describe("hasMentions", () => {
    it("should detect mentions", () => {
      expect(mentionParser.hasMentions("Hello @[John](123)")).toBe(true);
      expect(mentionParser.hasMentions("No mentions here")).toBe(false);
      expect(mentionParser.hasMentions("")).toBe(false);
    });
  });

  describe("countMentions", () => {
    it("should count mentions correctly", () => {
      expect(mentionParser.countMentions("@[Alice](1) and @[Bob](2)")).toBe(2);
      expect(mentionParser.countMentions("@[Alice](1)")).toBe(1);
      expect(mentionParser.countMentions("No mentions")).toBe(0);
    });
  });

  describe("sanitizeUserName", () => {
    it("should remove HTML tags", () => {
      const sanitized = mentionParser.sanitizeUserName(
        "<b>John</b> <i>Doe</i>"
      );

      expect(sanitized).toBe("John Doe");
    });

    it("should handle empty string", () => {
      expect(mentionParser.sanitizeUserName("")).toBe("");
    });
  });

  describe("createSafeMention", () => {
    it("should create sanitized mention", () => {
      const mention = mentionParser.createSafeMention("<b>John</b> Doe", 123);

      expect(mention).toBe("@[John Doe](123)");
    });
  });
});

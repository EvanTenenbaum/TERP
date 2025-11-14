import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MentionRenderer } from "./MentionRenderer";

describe("MentionRenderer", () => {
  it("should render plain text without mentions", () => {
    render(<MentionRenderer content="This is a plain comment" />);
    expect(screen.getByText("This is a plain comment")).toBeInTheDocument();
  });

  it("should highlight a single mention", () => {
    render(<MentionRenderer content="Hello @[John Doe](1), how are you?" />);
    
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("@John Doe")).toBeInTheDocument();
    expect(screen.getByText(", how are you?")).toBeInTheDocument();
  });

  it("should highlight multiple mentions", () => {
    render(
      <MentionRenderer content="Hey @[John Doe](1) and @[Jane Smith](2), check this out!" />
    );
    
    expect(screen.getByText("@John Doe")).toBeInTheDocument();
    expect(screen.getByText("@Jane Smith")).toBeInTheDocument();
    expect(screen.getByText(/Hey/)).toBeInTheDocument();
    expect(screen.getByText(/and/)).toBeInTheDocument();
    expect(screen.getByText(/check this out/)).toBeInTheDocument();
  });

  it("should handle mention at the start of content", () => {
    render(<MentionRenderer content="@[John Doe](1) please review this" />);
    
    expect(screen.getByText("@John Doe")).toBeInTheDocument();
    expect(screen.getByText(/please review this/)).toBeInTheDocument();
  });

  it("should handle mention at the end of content", () => {
    render(<MentionRenderer content="This is for @[John Doe](1)" />);
    
    expect(screen.getByText(/This is for/)).toBeInTheDocument();
    expect(screen.getByText("@John Doe")).toBeInTheDocument();
  });

  it("should handle consecutive mentions", () => {
    render(<MentionRenderer content="@[John Doe](1) @[Jane Smith](2)" />);
    
    expect(screen.getByText("@John Doe")).toBeInTheDocument();
    expect(screen.getByText("@Jane Smith")).toBeInTheDocument();
  });

  it("should preserve whitespace and line breaks", () => {
    const content = "Line 1\n@[John Doe](1)\nLine 3";
    const { container } = render(<MentionRenderer content={content} />);
    
    // Check that whitespace-pre-wrap is applied
    const div = container.querySelector("div");
    expect(div).toHaveClass("whitespace-pre-wrap");
  });

  it("should handle mentions with special characters in username", () => {
    render(<MentionRenderer content="Hello @[John O'Brien](1)" />);
    
    expect(screen.getByText("@John O'Brien")).toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it("should handle mentions with numbers in username", () => {
    render(<MentionRenderer content="Hello @[User123](1)" />);
    
    expect(screen.getByText("@User123")).toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <MentionRenderer content="Test" className="custom-class" />
    );
    
    const div = container.querySelector(".custom-class");
    expect(div).toBeInTheDocument();
  });

  it("should show username in title attribute", () => {
    render(<MentionRenderer content="Hello @[John Doe](1)" />);
    
    const mention = screen.getByText("@John Doe");
    expect(mention).toHaveAttribute("title", "Mentioned user: John Doe");
  });

  it("should style mentions with primary color", () => {
    render(<MentionRenderer content="Hello @[John Doe](1)" />);
    
    const mention = screen.getByText("@John Doe");
    expect(mention).toHaveClass("bg-primary/10");
    expect(mention).toHaveClass("text-primary");
  });

  it("should handle empty content", () => {
    const { container } = render(<MentionRenderer content="" />);
    const div = container.querySelector("div");
    expect(div).toBeEmptyDOMElement();
  });

  it("should handle content with @ but not a valid mention", () => {
    render(<MentionRenderer content="Email me @ john@example.com" />);
    
    expect(screen.getByText("Email me @ john@example.com")).toBeInTheDocument();
  });

  it("should handle malformed mention syntax", () => {
    render(<MentionRenderer content="Hello @[John Doe without closing" />);
    
    expect(screen.getByText("Hello @[John Doe without closing")).toBeInTheDocument();
  });

  it("should handle mention with missing userId", () => {
    render(<MentionRenderer content="Hello @[John Doe]()" />);
    
    // Should render as plain text since userId is missing
    expect(screen.getByText(/Hello @\[John Doe\]\(\)/)).toBeInTheDocument();
  });

  it("should handle multiple mentions in a long text", () => {
    const content = 
      "This is a long comment with @[User1](1) and @[User2](2) and @[User3](3) " +
      "mentioned multiple times throughout the text to test the rendering.";
    
    render(<MentionRenderer content={content} />);
    
    expect(screen.getByText("@User1")).toBeInTheDocument();
    expect(screen.getByText("@User2")).toBeInTheDocument();
    expect(screen.getByText("@User3")).toBeInTheDocument();
  });
});

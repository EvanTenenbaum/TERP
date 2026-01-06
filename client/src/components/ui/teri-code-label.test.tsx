/**
 * QA-W2-010: Unit tests for TeriCodeLabel component
 */
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeriCodeLabel } from "./teri-code-label";
import { TooltipProvider } from "./tooltip";

// Wrapper component to provide tooltip context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

describe("TeriCodeLabel", () => {
  describe("rendering", () => {
    it("renders with default label text", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel />
        </TestWrapper>
      );

      expect(screen.getByText("TERI Code")).toBeInTheDocument();
    });

    it("renders with custom label text", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel label="Client ID" />
        </TestWrapper>
      );

      expect(screen.getByText("Client ID")).toBeInTheDocument();
    });

    it("renders help icon by default", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel />
        </TestWrapper>
      );

      // Help icon should be present (the svg element)
      const helpIcon = document.querySelector("svg");
      expect(helpIcon).toBeInTheDocument();
    });

    it("hides help icon when showIcon is false", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel showIcon={false} />
        </TestWrapper>
      );

      // Should only render the text, no icon
      const helpIcons = document.querySelectorAll("svg");
      expect(helpIcons.length).toBe(0);
    });
  });

  describe("size variants", () => {
    it("renders small size without errors", () => {
      // Just verify it renders without throwing
      const { container } = render(
        <TestWrapper>
          <TeriCodeLabel size="sm" />
        </TestWrapper>
      );

      // Should render the label text
      expect(screen.getByText("TERI Code")).toBeInTheDocument();
      // Should render the component
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel className="custom-class" showIcon={false} />
        </TestWrapper>
      );

      const label = screen.getByText("TERI Code").closest("span");
      expect(label).toHaveClass("custom-class");
    });
  });

  describe("content without icon", () => {
    it("returns just the span with text when showIcon is false", () => {
      render(
        <TestWrapper>
          <TeriCodeLabel showIcon={false} />
        </TestWrapper>
      );

      // Should have the text
      expect(screen.getByText("TERI Code")).toBeInTheDocument();
    });
  });
});

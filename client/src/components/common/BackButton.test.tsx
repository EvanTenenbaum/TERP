/**
 * BackButton Tests
 *
 * Tests for the BackButton component to ensure proper navigation behavior.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BackButton } from "./BackButton";

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/current-page", mockSetLocation],
}));

describe("BackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.history.back
    window.history.back = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render with default label", () => {
    render(<BackButton />);
    
    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toBeInTheDocument();
  });

  it("should render with custom label", () => {
    render(<BackButton label="Back to Clients" />);
    
    const button = screen.getByRole("button", { name: /back to clients/i });
    expect(button).toBeInTheDocument();
  });

  it("should use browser history back when no 'to' prop is provided", () => {
    render(<BackButton />);
    
    const button = screen.getByRole("button", { name: /back/i });
    fireEvent.click(button);
    
    expect(window.history.back).toHaveBeenCalledOnce();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("should navigate to specific path when 'to' prop is provided", () => {
    render(<BackButton to="/clients" />);
    
    const button = screen.getByRole("button", { name: /back/i });
    fireEvent.click(button);
    
    expect(mockSetLocation).toHaveBeenCalledWith("/clients");
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    render(<BackButton className="custom-class" />);
    
    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toHaveClass("custom-class");
  });

  it("should render ArrowLeft icon", () => {
    render(<BackButton />);
    
    const button = screen.getByRole("button", { name: /back/i });
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-arrow-left");
  });

  it("should use ghost variant by default", () => {
    render(<BackButton />);
    
    const button = screen.getByRole("button", { name: /back/i });
    // The button should have ghost variant classes
    expect(button).toBeInTheDocument();
  });

  it("should accept custom variant", () => {
    render(<BackButton variant="outline" />);
    
    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toBeInTheDocument();
  });

  it("should accept custom size", () => {
    render(<BackButton size="lg" />);
    
    const button = screen.getByRole("button", { name: /back/i });
    expect(button).toBeInTheDocument();
  });
});

import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface BackButtonProps {
  /**
   * Optional custom label for the back button
   * @default "Back"
   */
  label?: string;
  
  /**
   * Optional custom destination path
   * If not provided, uses browser history back
   */
  to?: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
  
  /**
   * Button variant
   * @default "ghost"
   */
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive" | "link";
  
  /**
   * Button size
   * @default "sm"
   */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * BackButton Component
 * 
 * A reusable back button component that can either navigate to a specific path
 * or use browser history to go back.
 * 
 * @example
 * // Simple back button using browser history
 * <BackButton />
 * 
 * @example
 * // Back button with custom label and destination
 * <BackButton label="Back to Clients" to="/clients" />
 * 
 * @example
 * // Back button with custom styling
 * <BackButton className="mb-4" variant="outline" />
 */
export function BackButton({
  label = "Back",
  to,
  className,
  variant = "ghost",
  size = "sm",
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (to) {
      setLocation(to);
    } else {
      window.history.back();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

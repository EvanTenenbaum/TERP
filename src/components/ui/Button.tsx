"use client";
import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "default"|"primary"|"danger"|"ghost", 
  size?: "sm"|"md"|"lg" 
};
export const Button: React.FC<Props> = ({ variant="default", size="md", className="", children, ...rest }) => {
  const base = "inline-flex items-center justify-center rounded-md font-semibold transition select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-c-brand";
  const sizeMap = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-5 py-3 text-base" };
  const v = {
    default:"border border-mid/40 hover:bg-neutral3",
    primary:"bg-brand hover:bg-brandDark text-white",
    danger:"bg-error hover:bg-red-700 text-white",
    ghost:"hover:bg-neutral3"
  }[variant];
  
  // Auto-generate aria-label if not provided and button has no text content
  const ariaLabel = rest['aria-label'] || (typeof children === 'string' ? undefined : 'Button');
  
  return <button className={`${base} ${sizeMap[size]} ${v} ${className}`} aria-label={ariaLabel} {...rest}>{children}</button>;
};

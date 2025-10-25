import { ReactNode, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SwipeableWidgetContainerProps {
  children: ReactNode[];
  className?: string;
}

export function SwipeableWidgetContainer({ children, className }: SwipeableWidgetContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update current index based on scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const index = Math.round(scrollLeft / cardWidth);
      setCurrentIndex(index);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const cardWidth = container.offsetWidth;
    container.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Swipeable container - mobile only */}
      <div
        ref={scrollRef}
        className="md:hidden flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full snap-center"
            style={{ scrollSnapAlign: "center" }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Pagination dots - mobile only */}
      <div className="md:hidden flex justify-center gap-2 mt-4">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              index === currentIndex
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30"
            )}
            aria-label={`Go to widget ${index + 1}`}
          />
        ))}
      </div>

      {/* Grid layout - desktop only */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
}


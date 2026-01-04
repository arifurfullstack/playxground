import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "rounded-xl bg-card/60 backdrop-blur-xl transition-all duration-300",
  {
    variants: {
      border: {
        none: "border-0",
        default: "border border-border/50",
        pink: "border border-neon-pink/40 shadow-[0_0_15px_hsl(300,100%,50%,0.15)]",
        cyan: "border border-neon-cyan/40 shadow-[0_0_15px_hsl(180,100%,50%,0.15)]",
        green: "border border-neon-green/40 shadow-[0_0_15px_hsl(140,100%,50%,0.15)]",
        yellow: "border border-neon-yellow/40 shadow-[0_0_15px_hsl(50,100%,60%,0.15)]",
        purple: "border border-neon-purple/40 shadow-[0_0_15px_hsl(270,100%,60%,0.15)]",
      },
      hover: {
        none: "",
        glow: "hover:shadow-[0_0_25px_hsl(300,100%,50%,0.25)]",
        scale: "hover:scale-[1.02]",
        both: "hover:shadow-[0_0_25px_hsl(300,100%,50%,0.25)] hover:scale-[1.02]",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      border: "default",
      hover: "none",
      padding: "md",
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, border, hover, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ border, hover, padding, className }))}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };

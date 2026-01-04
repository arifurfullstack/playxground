import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const neonButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        pink: "bg-transparent border border-neon-pink text-neon-pink hover:bg-neon-pink/20 hover:shadow-[0_0_20px_hsl(300,100%,50%,0.5)]",
        cyan: "bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-[0_0_20px_hsl(180,100%,50%,0.5)]",
        green: "bg-transparent border border-neon-green text-neon-green hover:bg-neon-green/20 hover:shadow-[0_0_20px_hsl(140,100%,50%,0.5)]",
        yellow: "bg-transparent border border-neon-yellow text-neon-yellow hover:bg-neon-yellow/20 hover:shadow-[0_0_20px_hsl(50,100%,60%,0.5)]",
        purple: "bg-transparent border border-neon-purple text-neon-purple hover:bg-neon-purple/20 hover:shadow-[0_0_20px_hsl(270,100%,60%,0.5)]",
        filled: "bg-neon-pink text-primary-foreground border border-neon-pink hover:shadow-[0_0_30px_hsl(300,100%,50%,0.6)] hover:brightness-110",
        filledCyan: "bg-neon-cyan text-background border border-neon-cyan hover:shadow-[0_0_30px_hsl(180,100%,50%,0.6)] hover:brightness-110",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "pink",
      size: "md",
    },
  }
);

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(neonButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
NeonButton.displayName = "NeonButton";

export { NeonButton, neonButtonVariants };

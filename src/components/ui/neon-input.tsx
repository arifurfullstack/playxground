import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const neonInputVariants = cva(
  "flex w-full rounded-lg bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
  {
    variants: {
      variant: {
        pink: "border border-neon-pink/50 focus:border-neon-pink focus:shadow-[0_0_15px_hsl(300,100%,50%,0.3)]",
        cyan: "border border-neon-cyan/50 focus:border-neon-cyan focus:shadow-[0_0_15px_hsl(180,100%,50%,0.3)]",
        purple: "border border-neon-purple/50 focus:border-neon-purple focus:shadow-[0_0_15px_hsl(270,100%,60%,0.3)]",
        default: "border border-border focus:border-primary focus:shadow-[0_0_15px_hsl(300,100%,50%,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface NeonInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof neonInputVariants> {}

const NeonInput = React.forwardRef<HTMLInputElement, NeonInputProps>(
  ({ className, variant, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(neonInputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
NeonInput.displayName = "NeonInput";

export { NeonInput, neonInputVariants };

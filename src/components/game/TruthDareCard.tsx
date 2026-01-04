import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Flame, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TruthDareCardProps {
  type: 'truth' | 'dare' | 'mystery';
  content?: string;
  isFlipped: boolean;
  isRevealing?: boolean;
  price: number;
  onFlip?: () => void;
  disabled?: boolean;
}

export function TruthDareCard({
  type,
  content,
  isFlipped,
  isRevealing,
  price,
  onFlip,
  disabled
}: TruthDareCardProps) {
  const cardColors = {
    truth: {
      bg: 'from-neon-cyan/20 to-neon-cyan/5',
      border: 'border-neon-cyan',
      glow: 'shadow-[0_0_30px_hsl(180,100%,50%,0.4)]',
      text: 'text-neon-cyan',
      icon: MessageCircle,
    },
    dare: {
      bg: 'from-neon-pink/20 to-neon-pink/5',
      border: 'border-neon-pink',
      glow: 'shadow-[0_0_30px_hsl(300,100%,50%,0.4)]',
      text: 'text-neon-pink',
      icon: Flame,
    },
    mystery: {
      bg: 'from-neon-purple/20 to-neon-purple/5',
      border: 'border-neon-purple',
      glow: 'shadow-[0_0_30px_hsl(270,100%,60%,0.4)]',
      text: 'text-neon-purple',
      icon: Lock,
    }
  };

  const colorConfig = cardColors[type];
  const Icon = colorConfig.icon;

  return (
    <div className="perspective-1000 w-full max-w-xs mx-auto">
      <motion.div
        className="relative w-full aspect-[3/4] preserve-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        onClick={() => !disabled && !isFlipped && onFlip?.()}
        whileHover={!disabled && !isFlipped ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isFlipped ? { scale: 0.98 } : {}}
      >
        {/* Front of card */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col items-center justify-center",
            "bg-gradient-to-b border-2 transition-all duration-300",
            colorConfig.bg,
            colorConfig.border,
            !disabled && !isFlipped && "hover:scale-[1.02]",
            !disabled && !isFlipped && colorConfig.glow,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <motion.div
            animate={isRevealing ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Icon className={cn("w-16 h-16 mb-4", colorConfig.text)} />
          </motion.div>
          
          <h3 className={cn("text-2xl font-display font-bold uppercase mb-2", colorConfig.text)}>
            {type === 'mystery' ? '?' : type}
          </h3>
          
          <div className={cn(
            "mt-4 px-4 py-2 rounded-lg border text-sm font-medium",
            colorConfig.border,
            colorConfig.text
          )}>
            {type === 'truth' ? `Tip $${price / 2} to Reveal` : `Tip $${price} to Dare`}
          </div>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col items-center justify-center rotate-y-180",
            "bg-gradient-to-b border-2",
            colorConfig.bg,
            colorConfig.border,
            colorConfig.glow
          )}
        >
          <Icon className={cn("w-10 h-10 mb-4", colorConfig.text)} />
          
          <p className="text-center text-lg font-medium text-foreground leading-relaxed">
            {content || "Loading..."}
          </p>
          
          <div className={cn("mt-6 text-xs uppercase tracking-wider", colorConfig.text)}>
            {type === 'truth' ? 'Truth Revealed' : 'Dare Accepted'}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

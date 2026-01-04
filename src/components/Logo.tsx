import logoImage from '@/assets/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
  };

  return (
    <img
      src={logoImage}
      alt="PlayGroundX"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
}

export function LogoText({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <h1 className={`font-display font-bold ${sizeClasses[size]} ${className}`}>
      <span className="neon-text-pink">PlayGround</span>
      <span className="neon-text-cyan">X</span>
    </h1>
  );
}

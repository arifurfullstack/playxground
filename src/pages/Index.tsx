import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Flame, Gamepad2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NeonButton } from '@/components/ui/neon-button';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/feed');
    }
  }, [user, loading, navigate]);

  const features = [
    { icon: Heart, title: 'Connect', description: 'Subscribe to your favorite creators', color: 'neon-pink' },
    { icon: Flame, title: 'Exclusive', description: 'Unlock premium content & interactions', color: 'neon-orange' },
    { icon: Gamepad2, title: 'Play', description: 'Truth or Dare games in real-time', color: 'neon-cyan' },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial-pink opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial-cyan opacity-15 pointer-events-none" />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
            <span className="neon-text-pink">Play</span>
            <span className="text-foreground">Ground</span>
            <span className="neon-text-cyan">X</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Where creators and fans connect through exclusive content & interactive games
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <NeonButton variant="filled" size="lg" onClick={() => navigate('/auth')}>
            <Sparkles className="w-5 h-5" />
            Get Started
          </NeonButton>
          <NeonButton variant="cyan" size="lg" onClick={() => navigate('/auth')}>
            Sign In
          </NeonButton>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6 max-w-4xl w-full px-4"
        >
          {features.map((feature, index) => (
            <GlassCard
              key={feature.title}
              border={index === 0 ? 'pink' : index === 2 ? 'cyan' : 'yellow'}
              hover="both"
              className="text-center"
            >
              <div className={`w-14 h-14 mx-auto mb-4 rounded-full bg-${feature.color}/20 flex items-center justify-center`}>
                <feature.icon className={`w-7 h-7 text-${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-muted-foreground text-sm">
        <p>© 2024 PlayGroundX. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate('/auth');
      }
    };
    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been reset successfully.",
      });
      navigate('/feed');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial-pink opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-radial-cyan opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Logo size="lg" />
      </motion.div>

      <GlassCard border="pink" padding="lg" className="w-full max-w-md">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Set New Password
            </h2>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <NeonInput
              variant="pink"
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11"
              required
              minLength={6}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <NeonInput
              variant="pink"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-11"
              required
              minLength={6}
            />
          </div>

          <NeonButton
            type="submit"
            variant="filled"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </NeonButton>
        </motion.form>
      </GlassCard>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex items-center gap-2 text-muted-foreground"
      >
        <Sparkles className="w-4 h-4 text-neon-yellow" />
        <span className="text-sm">Secure password reset</span>
      </motion.div>
    </div>
  );
}

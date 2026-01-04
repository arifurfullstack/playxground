import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  Wallet,
  Building2
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function AdminGateways() {
  const { user, loading: authLoading, role } = useAuth();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (role === 'admin') {
      fetchGateways();
    }
  }, [role]);

  const fetchGateways = async () => {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setGateways(data as PaymentGateway[]);
    }
    setLoading(false);
  };

  const handleToggle = async (gateway: PaymentGateway) => {
    setSaving(gateway.id);
    
    const { error } = await supabase
      .from('payment_gateways')
      .update({ is_active: !gateway.is_active })
      .eq('id', gateway.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update gateway status',
        variant: 'destructive',
      });
    } else {
      setGateways(prev => 
        prev.map(g => g.id === gateway.id ? { ...g, is_active: !g.is_active } : g)
      );
      toast({
        title: 'Updated',
        description: `${gateway.name} is now ${!gateway.is_active ? 'active' : 'inactive'}`,
      });
    }
    setSaving(null);
  };

  const handleSave = async (gateway: PaymentGateway) => {
    setSaving(gateway.id);

    const { error } = await supabase
      .from('payment_gateways')
      .update({
        display_name: gateway.display_name,
        description: gateway.description,
        config: gateway.config,
      })
      .eq('id', gateway.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: `${gateway.name} settings updated`,
      });
    }
    setSaving(null);
  };

  const updateGateway = (id: string, field: string, value: any) => {
    setGateways(prev =>
      prev.map(g => g.id === id ? { ...g, [field]: value } : g)
    );
  };

  const updateConfig = (id: string, key: string, value: string) => {
    setGateways(prev =>
      prev.map(g => g.id === id ? { ...g, config: { ...g.config, [key]: value } } : g)
    );
  };

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'paypal':
        return <Wallet className="w-6 h-6 text-[#00457C]" />;
      case 'stripe':
        return <CreditCard className="w-6 h-6 text-[#635BFF]" />;
      case 'bank_transfer':
        return <Building2 className="w-6 h-6 text-neon-green" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-neon-purple" />
            <span className="neon-text-purple">Payment Gateways</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure payment gateway settings for user top-ups
          </p>
        </motion.header>

        {loading ? (
          <GlassCard border="default" className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading gateways...</div>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {gateways.map((gateway, index) => (
              <motion.div
                key={gateway.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard 
                  border={gateway.is_active ? 'green' : 'default'} 
                  className="relative"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-secondary/50">
                        {getGatewayIcon(gateway.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {gateway.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {gateway.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(gateway)}
                      disabled={saving === gateway.id}
                      className="flex items-center gap-2"
                    >
                      {gateway.is_active ? (
                        <ToggleRight className="w-10 h-10 text-neon-green" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground mb-2 block">Display Name</Label>
                      <NeonInput
                        value={gateway.display_name || ''}
                        onChange={(e) => updateGateway(gateway.id, 'display_name', e.target.value)}
                        placeholder="Display name shown to users"
                      />
                    </div>

                    <div>
                      <Label className="text-muted-foreground mb-2 block">Description</Label>
                      <Textarea
                        value={gateway.description || ''}
                        onChange={(e) => updateGateway(gateway.id, 'description', e.target.value)}
                        placeholder="Short description for users"
                        className="bg-secondary/50 border-border"
                      />
                    </div>

                    {gateway.type === 'paypal' && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">PayPal Email</Label>
                        <NeonInput
                          value={gateway.config.email || ''}
                          onChange={(e) => updateConfig(gateway.id, 'email', e.target.value)}
                          placeholder="PayPal account email"
                        />
                      </div>
                    )}

                    {gateway.type === 'stripe' && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">Stripe Mode</Label>
                        <NeonInput
                          value={gateway.config.sandbox ? 'Sandbox (Test Mode)' : 'Live'}
                          disabled
                          className="opacity-70"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure Stripe keys in backend settings
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <NeonButton
                      variant="cyan"
                      size="sm"
                      onClick={() => handleSave(gateway)}
                      disabled={saving === gateway.id}
                    >
                      <Save className="w-4 h-4" />
                      {saving === gateway.id ? 'Saving...' : 'Save Changes'}
                    </NeonButton>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

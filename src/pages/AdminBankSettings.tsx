import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Save, 
  Trash2,
  ToggleLeft, 
  ToggleRight,
  Edit2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BankSetting {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string | null;
  swift_code: string | null;
  additional_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyBank: Omit<BankSetting, 'id' | 'created_at' | 'updated_at'> = {
  bank_name: '',
  account_name: '',
  account_number: '',
  routing_number: '',
  swift_code: '',
  additional_info: '',
  is_active: true,
};

export default function AdminBankSettings() {
  const { user, loading: authLoading, role } = useAuth();
  const [banks, setBanks] = useState<BankSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<BankSetting | null>(null);
  const [formData, setFormData] = useState(emptyBank);
  const { toast } = useToast();

  useEffect(() => {
    if (role === 'admin') {
      fetchBanks();
    }
  }, [role]);

  const fetchBanks = async () => {
    const { data, error } = await supabase
      .from('bank_settings')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setBanks(data);
    }
    setLoading(false);
  };

  const handleToggle = async (bank: BankSetting) => {
    const { error } = await supabase
      .from('bank_settings')
      .update({ is_active: !bank.is_active })
      .eq('id', bank.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } else {
      setBanks(prev => 
        prev.map(b => b.id === bank.id ? { ...b, is_active: !b.is_active } : b)
      );
      toast({
        title: 'Updated',
        description: `Bank account is now ${!bank.is_active ? 'active' : 'inactive'}`,
      });
    }
  };

  const handleEdit = (bank: BankSetting) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      account_name: bank.account_name,
      account_number: bank.account_number,
      routing_number: bank.routing_number || '',
      swift_code: bank.swift_code || '',
      additional_info: bank.additional_info || '',
      is_active: bank.is_active,
    });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingBank(null);
    setFormData(emptyBank);
    setShowDialog(true);
  };

  const handleDelete = async (bank: BankSetting) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    const { error } = await supabase
      .from('bank_settings')
      .delete()
      .eq('id', bank.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete bank account',
        variant: 'destructive',
      });
    } else {
      setBanks(prev => prev.filter(b => b.id !== bank.id));
      toast({
        title: 'Deleted',
        description: 'Bank account has been removed',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const payload = {
      bank_name: formData.bank_name,
      account_name: formData.account_name,
      account_number: formData.account_number,
      routing_number: formData.routing_number || null,
      swift_code: formData.swift_code || null,
      additional_info: formData.additional_info || null,
      is_active: formData.is_active,
    };

    if (editingBank) {
      const { error } = await supabase
        .from('bank_settings')
        .update(payload)
        .eq('id', editingBank.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update bank account',
          variant: 'destructive',
        });
      } else {
        setBanks(prev => prev.map(b => 
          b.id === editingBank.id ? { ...b, ...payload } : b
        ));
        toast({
          title: 'Updated',
          description: 'Bank account has been updated',
        });
        setShowDialog(false);
      }
    } else {
      const { data, error } = await supabase
        .from('bank_settings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add bank account',
          variant: 'destructive',
        });
      } else if (data) {
        setBanks(prev => [...prev, data]);
        toast({
          title: 'Added',
          description: 'Bank account has been added',
        });
        setShowDialog(false);
      }
    }

    setSaving(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <Building2 className="w-8 h-8 text-neon-green" />
                <span className="neon-text-green">Bank Settings</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Configure bank accounts for receiving manual transfers
              </p>
            </div>
            <NeonButton variant="green" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Add Bank
            </NeonButton>
          </div>
        </motion.header>

        {loading ? (
          <GlassCard border="default" className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading bank accounts...</div>
          </GlassCard>
        ) : banks.length === 0 ? (
          <GlassCard border="default" className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No bank accounts configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a bank account for users to make manual transfers
            </p>
            <NeonButton variant="green" className="mt-4" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Add First Bank Account
            </NeonButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {banks.map((bank, index) => (
              <motion.div
                key={bank.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard 
                  border={bank.is_active ? 'green' : 'default'} 
                  className="relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <Building2 className="w-6 h-6 text-neon-green" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {bank.bank_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {bank.account_name}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-foreground">
                            <span className="text-muted-foreground">Account:</span> {bank.account_number}
                          </p>
                          {bank.routing_number && (
                            <p className="text-foreground">
                              <span className="text-muted-foreground">Routing:</span> {bank.routing_number}
                            </p>
                          )}
                          {bank.swift_code && (
                            <p className="text-foreground">
                              <span className="text-muted-foreground">SWIFT:</span> {bank.swift_code}
                            </p>
                          )}
                        </div>
                        {bank.additional_info && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {bank.additional_info}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(bank)}
                        className="p-2"
                        title={bank.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {bank.is_active ? (
                          <ToggleRight className="w-8 h-8 text-neon-green" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(bank)}
                        className="p-2 text-muted-foreground hover:text-neon-cyan"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(bank)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-muted-foreground mb-2 block">Bank Name *</Label>
                <NeonInput
                  value={formData.bank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="e.g., Chase, Bank of America"
                  required
                />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Account Holder Name *</Label>
                <NeonInput
                  value={formData.account_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="Full name on account"
                  required
                />
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Account Number *</Label>
                <NeonInput
                  value={formData.account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="Account number"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground mb-2 block">Routing Number</Label>
                  <NeonInput
                    value={formData.routing_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, routing_number: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground mb-2 block">SWIFT Code</Label>
                  <NeonInput
                    value={formData.swift_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, swift_code: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Additional Info</Label>
                <Textarea
                  value={formData.additional_info || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, additional_info: e.target.value }))}
                  placeholder="Any additional instructions for users"
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <NeonButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDialog(false)}
                  disabled={saving}
                >
                  Cancel
                </NeonButton>
                <NeonButton
                  type="submit"
                  variant="green"
                  disabled={saving}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editingBank ? 'Update' : 'Add Bank'}
                </NeonButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

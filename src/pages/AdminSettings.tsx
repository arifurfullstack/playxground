import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

export interface AdminNotificationSettings {
  soundEnabled: boolean;
  soundVolume: number;
  popupEnabled: boolean;
  toastEnabled: boolean;
}

const DEFAULT_SETTINGS: AdminNotificationSettings = {
  soundEnabled: true,
  soundVolume: 30,
  popupEnabled: true,
  toastEnabled: true,
};

export const getAdminNotificationSettings = (): AdminNotificationSettings => {
  try {
    const stored = localStorage.getItem('admin_notification_settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to parse notification settings:', e);
  }
  return DEFAULT_SETTINGS;
};

export const saveAdminNotificationSettings = (settings: AdminNotificationSettings) => {
  localStorage.setItem('admin_notification_settings', JSON.stringify(settings));
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminNotificationSettings>(getAdminNotificationSettings);

  const updateSettings = (partial: Partial<AdminNotificationSettings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    saveAdminNotificationSettings(newSettings);
    toast.success('Settings saved');
  };

  const testSound = () => {
    if (!settings.soundEnabled) {
      toast.error('Sound is disabled');
      return;
    }
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = settings.soundVolume / 100;
      audio.play().catch(() => {
        toast.error('Could not play sound');
      });
    } catch (e) {
      toast.error('Could not play sound');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-cyan mb-2">
            Admin Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your admin panel preferences
          </p>
        </header>

        <GlassCard border="cyan" className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Bell className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-lg font-semibold text-foreground">Notification Settings</h2>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-muted-foreground" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="sound-enabled" className="text-foreground font-medium">
                  Sound Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Play a sound when new payment requests arrive
                </p>
              </div>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>

          {/* Volume Slider */}
          {settings.soundEnabled && (
            <div className="space-y-3 pl-8">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Volume</Label>
                <span className="text-sm text-foreground font-mono">{settings.soundVolume}%</span>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[settings.soundVolume]}
                  onValueChange={(value) => updateSettings({ soundVolume: value[0] })}
                  max={100}
                  min={0}
                  step={5}
                  className="flex-1"
                />
                <button
                  onClick={testSound}
                  className="text-sm text-neon-cyan hover:underline whitespace-nowrap"
                >
                  Test sound
                </button>
              </div>
            </div>
          )}

          {/* Popup Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <Label htmlFor="popup-enabled" className="text-foreground font-medium">
                Popup Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show floating popup for new payment requests
              </p>
            </div>
            <Switch
              id="popup-enabled"
              checked={settings.popupEnabled}
              onCheckedChange={(checked) => updateSettings({ popupEnabled: checked })}
            />
          </div>

          {/* Toast Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <Label htmlFor="toast-enabled" className="text-foreground font-medium">
                Toast Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show toast messages for new payment requests
              </p>
            </div>
            <Switch
              id="toast-enabled"
              checked={settings.toastEnabled}
              onCheckedChange={(checked) => updateSettings({ toastEnabled: checked })}
            />
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
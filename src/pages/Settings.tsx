import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, Save, User, Loader2, Tag, LogOut, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const AVAILABLE_CATEGORIES = [
  'Fitness',
  'Gaming',
  'Music',
  'Art',
  'Fashion',
  'Lifestyle',
  'Comedy',
  'Education',
  'Cooking',
  'Travel',
  'Tech',
  'Beauty',
];

export default function Settings() {
  const { user, loading, profile, role, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarPreview(profile.avatar_url || null);
      fetchCategories();
    }
  }, [profile]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('categories')
      .eq('id', user.id)
      .single();

    if (data?.categories) {
      setSelectedCategories(data.categories as string[]);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : prev.length < 5
          ? [...prev, category]
          : prev
    );
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!user || !avatarFile) return profile?.avatar_url || null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Delete old avatar if exists
    await supabase.storage.from('avatars').remove([filePath]);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache buster to force refresh
    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url || null;

      if (avatarFile) {
        setUploadingAvatar(true);
        const uploadedUrl = await uploadAvatar();
        setUploadingAvatar(false);

        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          toast.error('Failed to upload avatar');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          categories: selectedCategories,
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to save profile');
      } else {
        toast.success('Profile updated!');
        setAvatarFile(null);
        await refreshProfile();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-neon-pink">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Customize your profile</p>
        </header>

        <GlassCard border="pink" className="mb-6">
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-4xl font-bold border-4 border-neon-pink/50 shadow-lg shadow-neon-pink/30 overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-foreground/60" />
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-8 h-8 text-foreground" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              <p className="text-sm text-muted-foreground">Click to upload a profile picture</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Display Name</label>
              <NeonInput
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                variant="pink"
              />
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Username</label>
              <NeonInput
                value={profile?.username || ''}
                disabled
                variant="cyan"
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                className="min-h-[120px] bg-background/50 border-neon-pink/30 focus:border-neon-pink"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
            </div>

            {/* Categories (Creators only) */}
            {role === 'creator' && (
              <div>
                <label className="text-sm text-muted-foreground block mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Content Categories
                  <span className="text-xs">({selectedCategories.length}/5)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedCategories.includes(category)
                          ? 'border-neon-purple bg-neon-purple/20 text-neon-purple'
                          : 'border-border hover:border-neon-purple/50 text-muted-foreground'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select up to 5 categories that describe your content
                </p>
              </div>
            )}

            {/* Save Button */}
            <NeonButton
              variant="filled"
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading avatar...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </NeonButton>
          </div>
        </GlassCard>

        {/* Security Settings */}
        <GlassCard border="cyan" className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-lg font-display font-bold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">New Password</label>
              <NeonInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                variant="cyan"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Confirm New Password</label>
              <NeonInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                variant="cyan"
              />
            </div>

            <NeonButton
              variant="outline"
              onClick={handlePasswordChange}
              disabled={updatingPassword || !newPassword}
              className="w-full border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </NeonButton>
          </div>
        </GlassCard>

        {/* Account Info */}
        <GlassCard border="cyan">
          <h3 className="text-lg font-display font-bold text-foreground mb-4">Account Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span className="neon-text-cyan">${profile?.wallet_balance.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </GlassCard>

        {/* Logout */}
        <GlassCard border="pink" className="mt-6">
          <h3 className="text-lg font-display font-bold text-foreground mb-4">Account Actions</h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all font-medium">
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await signOut();
                    navigate('/auth');
                    toast.success('Logged out successfully');
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </GlassCard>
      </div>
    </AppLayout>
  );
}

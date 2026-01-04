import { useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatePostProps {
  userId: string;
  onPostCreated: () => void;
}

export function CreatePost({ userId, onPostCreated }: CreatePostProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error('Please add some content or media');
      return;
    }

    setIsSubmitting(true);

    try {
      let contentUrl: string | null = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, mediaFile);

        if (uploadError) {
          throw new Error('Failed to upload media');
        }

        const { data: urlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        contentUrl = urlData.publicUrl;
      }

      // Create the post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          creator_id: userId,
          title: title.trim() || null,
          content: content.trim() || null,
          content_url: contentUrl,
          is_locked: isLocked,
        });

      if (postError) {
        throw new Error('Failed to create post');
      }

      toast.success('Post created!');
      
      // Reset form
      setTitle('');
      setContent('');
      setIsLocked(false);
      removeMedia();
      
      onPostCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVideo = mediaFile?.type.startsWith('video/');

  return (
    <GlassCard border="cyan" className="mb-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Create Post</h3>
      
      <div className="space-y-4">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
        
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />

        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative rounded-lg overflow-hidden">
            {isVideo ? (
              <video src={mediaPreview} className="w-full max-h-64 object-cover rounded-lg" controls />
            ) : (
              <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
            )}
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Media Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
              disabled={isSubmitting}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-muted-foreground hover:text-neon-cyan transition-colors"
              disabled={isSubmitting}
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-sm">Add Media</span>
            </button>

            {/* Locked Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="locked"
                checked={isLocked}
                onCheckedChange={setIsLocked}
                disabled={isSubmitting}
              />
              <Label htmlFor="locked" className="text-sm text-muted-foreground cursor-pointer">
                Subscribers only
              </Label>
            </div>
          </div>

          <NeonButton
            variant="filled"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !mediaFile)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </NeonButton>
        </div>
      </div>
    </GlassCard>
  );
}

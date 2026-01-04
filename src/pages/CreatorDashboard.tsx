import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Edit2, 
  Trash2, 
  Lock, 
  Unlock,
  Save,
  X,
  Image,
  Upload,
  Video,
  Loader2,
  Heart,
  Gift,
  MessageCircle,
  Check,
  Clock,
  Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Post {
  id: string;
  title: string | null;
  content: string | null;
  content_url: string | null;
  is_locked: boolean;
  price: number;
  likes_count: number;
  created_at: string;
}

interface Suga4URequest {
  id: string;
  sender_id: string;
  amount: number;
  description: string | null;
  created_at: string;
  sender?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function CreatorDashboard() {
  const { user, loading, profile, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  
  // Suga4U requests state
  const [suga4uRequests, setSuga4uRequests] = useState<Suga4URequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [respondingTo, setRespondingTo] = useState<Suga4URequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  
  // New post state
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostLocked, setNewPostLocked] = useState(false);
  const [newPostPrice, setNewPostPrice] = useState('0');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [newPostMediaPreview, setNewPostMediaPreview] = useState<string | null>(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const newMediaInputRef = useRef<HTMLInputElement>(null);
  
  // Edit post state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLocked, setEditLocked] = useState(false);
  const [editPrice, setEditPrice] = useState('0');
  const [editMedia, setEditMedia] = useState<File | null>(null);
  const [editMediaPreview, setEditMediaPreview] = useState<string | null>(null);
  const [updatingPost, setUpdatingPost] = useState(false);
  const editMediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setSubscriptionPrice(profile.subscription_price.toString());
    }
  }, [profile]);

  useEffect(() => {
    if (user && role === 'creator') {
      fetchPosts();
      fetchSuga4URequests();
    }
  }, [user, role]);

  const fetchPosts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load posts', variant: 'destructive' });
    } else {
      setPosts(data || []);
    }
    setLoadingPosts(false);
  };

  const fetchSuga4URequests = async () => {
    if (!user) return;
    setLoadingRequests(true);

    // Fetch transactions of type 'suga4u' where this creator is the receiver
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('type', 'suga4u')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching suga4u requests:', error);
      setLoadingRequests(false);
      return;
    }

    if (!data || data.length === 0) {
      setSuga4uRequests([]);
      setLoadingRequests(false);
      return;
    }

    // Fetch sender profiles
    const senderIds = [...new Set(data.map(tx => tx.sender_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', senderIds);

    const requestsWithSenders: Suga4URequest[] = data.map(tx => ({
      id: tx.id,
      sender_id: tx.sender_id!,
      amount: Number(tx.amount),
      description: tx.description,
      created_at: tx.created_at,
      sender: profiles?.find(p => p.id === tx.sender_id) || undefined,
    }));

    setSuga4uRequests(requestsWithSenders);
    setLoadingRequests(false);
  };

  const handleRespondToRequest = async () => {
    if (!respondingTo || !user || !responseMessage.trim()) return;

    setSendingResponse(true);

    try {
      // Find or create conversation with the fan
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(creator_id.eq.${user.id},fan_id.eq.${respondingTo.sender_id}),and(creator_id.eq.${respondingTo.sender_id},fan_id.eq.${user.id})`)
        .maybeSingle();

      let conversationId: string;

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            creator_id: user.id,
            fan_id: respondingTo.sender_id,
          })
          .select('id')
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }

      // Send the response message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `📬 Response to your Suga4U request:\n\n${responseMessage}`,
      });

      if (msgError) throw msgError;

      // Create notification for the fan
      await supabase.from('notifications').insert({
        user_id: respondingTo.sender_id,
        actor_id: user.id,
        type: 'suga4u_response',
        content: `Responded to your Suga4U request!`,
      });

      toast({ title: 'Response sent!', description: 'Your response has been sent to the fan.' });
      setRespondingTo(null);
      setResponseMessage('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send response', variant: 'destructive' });
    } finally {
      setSendingResponse(false);
    }
  };

  const handleSaveSubscriptionPrice = async () => {
    if (!user) return;
    
    const price = parseFloat(subscriptionPrice);
    if (isNaN(price) || price < 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid price', variant: 'destructive' });
      return;
    }

    setSavingPrice(true);
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_price: price })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update price', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Subscription price updated!' });
      refreshProfile();
    }
    setSavingPrice(false);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please select an image or video file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 50MB', variant: 'destructive' });
      return;
    }

    const preview = URL.createObjectURL(file);
    
    if (isEdit) {
      setEditMedia(file);
      setEditMediaPreview(preview);
    } else {
      setNewPostMedia(file);
      setNewPostMediaPreview(preview);
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('post-media')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim()) {
      toast({ title: 'Error', description: 'Please enter a title', variant: 'destructive' });
      return;
    }

    setCreatingPost(true);
    
    let contentUrl: string | null = null;
    if (newPostMedia) {
      setUploadingMedia(true);
      contentUrl = await uploadMedia(newPostMedia);
      setUploadingMedia(false);
      
      if (!contentUrl) {
        toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
        setCreatingPost(false);
        return;
      }
    }

    const { error } = await supabase.from('posts').insert({
      creator_id: user.id,
      title: newPostTitle.trim(),
      content: newPostContent.trim() || null,
      content_url: contentUrl,
      is_locked: newPostLocked,
      price: parseFloat(newPostPrice) || 0,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Post created!' });
      setShowNewPost(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostLocked(false);
      setNewPostPrice('0');
      setNewPostMedia(null);
      setNewPostMediaPreview(null);
      fetchPosts();
    }
    setCreatingPost(false);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setEditLocked(post.is_locked);
    setEditPrice(post.price.toString());
    setEditMedia(null);
    setEditMediaPreview(post.content_url);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editTitle.trim()) return;

    setUpdatingPost(true);
    
    let contentUrl = editingPost.content_url;
    if (editMedia) {
      setUploadingMedia(true);
      const uploadedUrl = await uploadMedia(editMedia);
      setUploadingMedia(false);
      
      if (!uploadedUrl) {
        toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
        setUpdatingPost(false);
        return;
      }
      contentUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from('posts')
      .update({
        title: editTitle.trim(),
        content: editContent.trim() || null,
        content_url: contentUrl,
        is_locked: editLocked,
        price: parseFloat(editPrice) || 0,
      })
      .eq('id', editingPost.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update post', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Post updated!' });
      setEditingPost(null);
      setEditMedia(null);
      setEditMediaPreview(null);
      fetchPosts();
    }
    setUpdatingPost(false);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Post removed' });
      fetchPosts();
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

  if (role !== 'creator') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <GlassCard border="pink" className="text-center py-12">
            <Lock className="w-16 h-16 text-neon-pink mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Creator Access Only</h2>
            <p className="text-muted-foreground">This dashboard is only available for creators.</p>
          </GlassCard>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your content and earnings</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard border="cyan" className="text-center">
            <DollarSign className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Pending Earnings</p>
            <p className="text-2xl font-display font-bold text-neon-cyan">
              ${profile?.pending_balance.toFixed(2) || '0.00'}
            </p>
          </GlassCard>
          
          <GlassCard border="green" className="text-center">
            <TrendingUp className="w-8 h-8 text-neon-green mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Total Posts</p>
            <p className="text-2xl font-display font-bold text-neon-green">{posts.length}</p>
          </GlassCard>
          
          <GlassCard border="purple" className="text-center">
            <DollarSign className="w-8 h-8 text-neon-purple mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Subscription Price</p>
            <p className="text-2xl font-display font-bold text-neon-purple">
              ${profile?.subscription_price.toFixed(2) || '9.99'}/mo
            </p>
          </GlassCard>
        </div>

        {/* Subscription Price Setting */}
        <GlassCard border="pink" className="mb-8">
          <h3 className="text-lg font-display font-bold text-foreground mb-4">Subscription Price</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground block mb-2">Monthly price ($)</label>
              <NeonInput
                type="number"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(e.target.value)}
                min="0"
                step="0.01"
                variant="cyan"
              />
            </div>
            <NeonButton
              variant="cyan"
              onClick={handleSaveSubscriptionPrice}
              disabled={savingPrice}
            >
              <Save className="w-4 h-4 mr-2" />
              {savingPrice ? 'Saving...' : 'Save'}
            </NeonButton>
          </div>
        </GlassCard>

        {/* Suga4U Requests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-neon-pink" />
              Suga4U Requests
            </h3>
            {suga4uRequests.length > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-neon-pink/20 text-neon-pink border border-neon-pink/30">
                {suga4uRequests.length} new
              </span>
            )}
          </div>

          {loadingRequests ? (
            <GlassCard className="text-center py-6">
              <Loader2 className="w-6 h-6 text-neon-pink mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground mt-2">Loading requests...</p>
            </GlassCard>
          ) : suga4uRequests.length === 0 ? (
            <GlassCard border="pink" className="text-center py-8">
              <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No Suga4U requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When fans send you special requests, they'll appear here
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {suga4uRequests.map((request) => (
                <GlassCard key={request.id} border="pink" hover="glow">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Sender Avatar */}
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm sm:text-lg font-bold shrink-0 cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/profile/${request.sender_id}`)}
                    >
                      {request.sender?.avatar_url ? (
                        <img 
                          src={request.sender.avatar_url} 
                          alt={request.sender?.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        request.sender?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>

                    {/* Request Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="font-semibold text-sm sm:text-base text-foreground truncate cursor-pointer hover:text-neon-pink transition-colors"
                          onClick={() => navigate(`/profile/${request.sender_id}`)}
                        >
                          {request.sender?.display_name || request.sender?.username || 'Unknown'}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30 shrink-0">
                          ${request.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-sm text-foreground bg-secondary/30 p-2 sm:p-3 rounded-lg">
                        {request.description?.replace('Suga4U Request: ', '') || 'No message'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                    <NeonButton 
                      variant="pink" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setRespondingTo(request)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Respond
                    </NeonButton>
                    <NeonButton 
                      variant="cyan" 
                      size="sm"
                      onClick={() => navigate(`/messages`)}
                    >
                      <Send className="w-4 h-4" />
                    </NeonButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Create New Post */}
        <div className="mb-8">
          {!showNewPost ? (
            <NeonButton variant="filled" onClick={() => setShowNewPost(true)} className="w-full">
              <Plus className="w-5 h-5 mr-2" />
              Create New Post
            </NeonButton>
          ) : (
            <GlassCard border="pink">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-bold text-foreground">New Post</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowNewPost(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Title</label>
                  <NeonInput
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Post title..."
                    variant="pink"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Content</label>
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-[100px] bg-background/50 border-neon-pink/30 focus:border-neon-pink"
                  />
                </div>

                {/* Media Upload */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Media (optional)</label>
                  <input
                    ref={newMediaInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleMediaSelect(e, false)}
                    className="hidden"
                  />
                  
                  {newPostMediaPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-neon-pink/30">
                      {newPostMedia?.type.startsWith('video/') ? (
                        <video src={newPostMediaPreview} className="w-full max-h-48 object-cover" controls />
                      ) : (
                        <img src={newPostMediaPreview} alt="Preview" className="w-full max-h-48 object-cover" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                        onClick={() => {
                          setNewPostMedia(null);
                          setNewPostMediaPreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => newMediaInputRef.current?.click()}
                      className="w-full p-6 border-2 border-dashed border-neon-pink/30 rounded-lg hover:border-neon-pink/60 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Click to upload image or video</span>
                      <span className="text-xs text-muted-foreground">Max 50MB</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={newPostLocked}
                      onCheckedChange={setNewPostLocked}
                    />
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      {newPostLocked ? <Lock className="w-4 h-4 text-neon-pink" /> : <Unlock className="w-4 h-4 text-neon-green" />}
                      {newPostLocked ? 'Locked (Subscribers only)' : 'Free (Everyone)'}
                    </span>
                  </div>
                  
                  {newPostLocked && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Price $</label>
                      <NeonInput
                        type="number"
                        value={newPostPrice}
                        onChange={(e) => setNewPostPrice(e.target.value)}
                        className="w-20"
                        variant="pink"
                        min="0"
                      />
                    </div>
                  )}
                </div>
                
                <NeonButton
                  variant="filled"
                  onClick={handleCreatePost}
                  disabled={creatingPost || uploadingMedia}
                  className="w-full"
                >
                  {uploadingMedia ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading media...
                    </>
                  ) : creatingPost ? 'Creating...' : 'Publish Post'}
                </NeonButton>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <h3 className="text-xl font-display font-bold text-foreground">Your Posts</h3>
          
          {loadingPosts ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : posts.length === 0 ? (
            <GlassCard border="pink" className="text-center py-8">
              <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No posts yet. Create your first post!</p>
            </GlassCard>
          ) : (
            posts.map((post) => (
              <GlassCard key={post.id} border={post.is_locked ? 'pink' : 'green'} hover="glow">
                {editingPost?.id === post.id ? (
                  <div className="space-y-4">
                    <NeonInput
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      variant="pink"
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px] bg-background/50 border-border"
                    />
                    
                    {/* Edit Media Upload */}
                    <div>
                      <input
                        ref={editMediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleMediaSelect(e, true)}
                        className="hidden"
                      />
                      
                      {editMediaPreview ? (
                        <div className="relative rounded-lg overflow-hidden border border-border/50">
                          {(editMedia?.type.startsWith('video/') || editMediaPreview.includes('.mp4') || editMediaPreview.includes('.webm')) ? (
                            <video src={editMediaPreview} className="w-full max-h-32 object-cover" controls />
                          ) : (
                            <img src={editMediaPreview} alt="Preview" className="w-full max-h-32 object-cover" />
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="bg-background/80 hover:bg-background h-8 w-8"
                              onClick={() => editMediaInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => editMediaInputRef.current?.click()}
                          className="w-full p-4 border-2 border-dashed border-border/50 rounded-lg hover:border-neon-pink/60 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
                        >
                          <Upload className="w-4 h-4" />
                          Add media
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch checked={editLocked} onCheckedChange={setEditLocked} />
                        <span className="text-sm text-muted-foreground">
                          {editLocked ? 'Locked' : 'Free'}
                        </span>
                      </div>
                      {editLocked && (
                        <NeonInput
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20"
                          variant="pink"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <NeonButton variant="cyan" onClick={handleUpdatePost} disabled={updatingPost || uploadingMedia}>
                        <Save className="w-4 h-4 mr-2" />
                        {uploadingMedia ? 'Uploading...' : updatingPost ? 'Saving...' : 'Save'}
                      </NeonButton>
                      <Button variant="ghost" onClick={() => {
                        setEditingPost(null);
                        setEditMedia(null);
                        setEditMediaPreview(null);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{post.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {post.is_locked ? (
                          <span className="flex items-center gap-1 text-xs bg-neon-pink/20 text-neon-pink px-2 py-1 rounded">
                            <Lock className="w-3 h-3" /> ${Number(post.price).toFixed(2)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">
                            <Unlock className="w-3 h-3" /> Free
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Post Media Preview */}
                    {post.content_url && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        {post.content_url.includes('.mp4') || post.content_url.includes('.webm') || post.content_url.includes('.mov') ? (
                          <video src={post.content_url} className="w-full max-h-48 object-cover rounded-lg" controls />
                        ) : (
                          <img src={post.content_url} alt={post.title || 'Post media'} className="w-full max-h-48 object-cover rounded-lg" />
                        )}
                      </div>
                    )}
                    
                    {post.content && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{post.content}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">❤️ {post.likes_count} likes</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditPost(post)}>
                          <Edit2 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeletePost(post.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </GlassCard>
            ))
          )}
        </div>

        {/* Respond to Suga4U Request Dialog */}
        <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
          <DialogContent className="glass-card border-neon-pink/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-display flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-neon-pink" />
                <span className="neon-text-pink">Respond to Request</span>
              </DialogTitle>
            </DialogHeader>

            {respondingTo && (
              <div className="space-y-4 pt-2">
                {/* Fan Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center font-bold overflow-hidden">
                    {respondingTo.sender?.avatar_url ? (
                      <img
                        src={respondingTo.sender.avatar_url}
                        alt={respondingTo.sender?.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      respondingTo.sender?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {respondingTo.sender?.display_name || respondingTo.sender?.username}
                    </p>
                    <p className="text-xs text-neon-green">Tipped ${respondingTo.amount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Original Request */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Their Request</label>
                  <p className="text-sm text-foreground bg-secondary/20 p-3 rounded-lg border border-border/50">
                    {respondingTo.description?.replace('Suga4U Request: ', '') || 'No message'}
                  </p>
                </div>

                {/* Response Message */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Your Response</label>
                  <Textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Write your response to fulfill their request..."
                    className="min-h-[100px] bg-background/50 border-neon-pink/30 focus:border-neon-pink"
                  />
                </div>

                {/* Send Button */}
                <NeonButton
                  variant="filled"
                  className="w-full"
                  onClick={handleRespondToRequest}
                  disabled={sendingResponse || !responseMessage.trim()}
                >
                  {sendingResponse ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sendingResponse ? 'Sending...' : 'Send Response'}
                </NeonButton>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

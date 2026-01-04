import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Heart, MessageCircle, Send, Trash2, ArrowLeft, Share2, Copy, Twitter, Facebook } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  title: string | null;
  content: string | null;
  content_url: string | null;
  is_locked: boolean;
  likes_count: number;
  creator_id: string;
  created_at: string;
  creator: Creator;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId, user]);

  const fetchPost = async () => {
    if (!postId) return;

    const { data: postData, error } = await supabase
      .from('posts')
      .select(`
        *,
        creator:profiles!posts_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error || !postData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPost(postData as unknown as Post);
    setLikesCount(postData.likes_count || 0);

    // Check if subscribed
    if (user) {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('fan_id', user.id)
        .eq('creator_id', postData.creator_id)
        .eq('status', 'active')
        .maybeSingle();

      setIsSubscribed(!!subData);

      // Check if liked
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsLiked(!!likeData);
    }

    // Fetch comments
    await fetchComments();
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!postId) return;

    const { data } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        user:profiles!comments_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data as unknown as Comment[]);
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;

    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (!error) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        await supabase
          .from('posts')
          .update({ likes_count: Math.max(0, likesCount - 1) })
          .eq('id', post.id);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });

      if (!error) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        await supabase
          .from('posts')
          .update({ likes_count: likesCount + 1 })
          .eq('id', post.id);
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !postId) return;

    setSubmittingComment(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim()
      });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
      await fetchComments();
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getPostUrl = () => `${window.location.origin}/post/${postId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPostUrl());
      toast.success('Link copied to clipboard');
      setShareOpen(false);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareTwitter = () => {
    const text = post?.title || post?.content?.substring(0, 100) || 'Check out this post';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getPostUrl())}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostUrl())}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-neon-pink">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (notFound) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <GlassCard className="text-center py-12">
            <p className="text-muted-foreground mb-4">Post not found</p>
            <NeonButton variant="pink" onClick={() => navigate('/feed')}>
              Back to Feed
            </NeonButton>
          </GlassCard>
        </div>
      </AppLayout>
    );
  }

  if (!post) return null;

  const isOwn = user?.id === post.creator_id;
  const canView = !post.is_locked || isSubscribed || isOwn;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Post Content */}
        <GlassCard border="pink" className="mb-6">
          {/* Creator Header */}
          <div 
            className="flex items-center gap-3 mb-4 cursor-pointer" 
            onClick={() => navigate(`/profile/${post.creator_id}`)}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-lg font-bold overflow-hidden">
              {post.creator?.avatar_url ? (
                <img 
                  src={post.creator.avatar_url} 
                  alt={post.creator.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.creator?.username?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground hover:text-neon-pink transition-colors">
                {post.creator?.display_name || post.creator?.username}
              </p>
              <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
            </div>
          </div>

          {/* Post Body */}
          {!canView ? (
            <div className="relative">
              <div className="h-64 rounded-lg bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 blur-sm" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Lock className="w-12 h-12 text-neon-pink mb-3" />
                <p className="text-muted-foreground mb-3">Subscribe to unlock this content</p>
                <NeonButton 
                  variant="filled" 
                  onClick={() => navigate(`/profile/${post.creator_id}`)}
                >
                  Subscribe
                </NeonButton>
              </div>
            </div>
          ) : (
            <div>
              {post.content_url && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  {post.content_url.includes('.mp4') || post.content_url.includes('.webm') || post.content_url.includes('.mov') ? (
                    <video 
                      src={post.content_url} 
                      className="w-full rounded-lg" 
                      controls 
                    />
                  ) : (
                    <img 
                      src={post.content_url} 
                      alt={post.title || 'Post'} 
                      className="w-full rounded-lg" 
                    />
                  )}
                </div>
              )}
              {post.title && (
                <h1 className="text-xl font-bold text-foreground mb-3">{post.title}</h1>
              )}
              {post.content && (
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border/50">
            <button 
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-neon-pink' : 'text-muted-foreground hover:text-neon-pink'
              } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-5 h-5" />
              <span>{comments.length}</span>
            </div>
            <button 
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 text-muted-foreground hover:text-neon-purple transition-colors ml-auto"
            >
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>
        </GlassCard>

        {/* Comments Section */}
        <GlassCard border="cyan">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-neon-cyan" />
            Comments ({comments.length})
          </h2>

          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/profile/${comment.user_id}`)}
                  >
                    {comment.user?.avatar_url ? (
                      <img 
                        src={comment.user.avatar_url} 
                        alt={comment.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      comment.user?.username?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="font-semibold text-sm cursor-pointer hover:text-neon-pink transition-colors"
                        onClick={() => navigate(`/profile/${comment.user_id}`)}
                      >
                        {comment.user?.display_name || comment.user?.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(comment.created_at)}
                      </span>
                      {comment.user_id === user?.id && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-foreground break-words mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment */}
          {user ? (
            <div className="flex gap-2 pt-4 border-t border-border/50">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                disabled={submittingComment}
                className="flex-1"
              />
              <NeonButton 
                variant="filled" 
                size="sm" 
                onClick={handleSubmitComment}
                disabled={submittingComment || !newComment.trim()}
              >
                <Send className="w-4 h-4" />
              </NeonButton>
            </div>
          ) : (
            <div className="pt-4 border-t border-border/50 text-center">
              <p className="text-muted-foreground mb-2">Sign in to comment</p>
              <NeonButton variant="pink" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </NeonButton>
            </div>
          )}
        </GlassCard>

        {/* Share Dialog */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Share Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-neon-pink hover:bg-neon-pink/10 transition-all"
              >
                <Copy className="w-5 h-5 text-neon-pink" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={handleShareTwitter}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-neon-cyan hover:bg-neon-cyan/10 transition-all"
              >
                <Twitter className="w-5 h-5 text-neon-cyan" />
                <span>Share on Twitter</span>
              </button>
              <button
                onClick={handleShareFacebook}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-neon-purple hover:bg-neon-purple/10 transition-all"
              >
                <Facebook className="w-5 h-5 text-neon-purple" />
                <span>Share on Facebook</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

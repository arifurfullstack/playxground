import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Lock, Heart, MessageCircle, Send, Trash2, MoreHorizontal, Pencil, Share2, Copy, Twitter, Facebook, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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

interface PostCardProps {
  post: {
    id: string;
    title: string | null;
    content: string | null;
    content_url: string | null;
    is_locked: boolean;
    likes_count: number;
    creator_id: string;
    created_at: string;
    creator: Creator;
  };
  userId: string;
  isSubscribed: boolean;
  isLiked: boolean;
  isBookmarked?: boolean;
  commentsCount: number;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onBookmarkToggle?: (postId: string, isBookmarked: boolean) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: () => void;
}

export function PostCard({ post, userId, isSubscribed, isLiked, isBookmarked = false, commentsCount, onLikeToggle, onBookmarkToggle, onPostDeleted, onPostUpdated }: PostCardProps) {
  const navigate = useNavigate();
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(commentsCount);
  
  // Edit/Delete state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');
  const [editIsLocked, setEditIsLocked] = useState(post.is_locked);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwn = post.creator_id === userId;
  const canView = !post.is_locked || isSubscribed || isOwn;

  const handleBookmark = async () => {
    if (bookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId);

      if (!error) {
        setBookmarked(false);
        onBookmarkToggle?.(post.id, false);
        toast.success('Removed from bookmarks');
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ post_id: post.id, user_id: userId });

      if (!error) {
        setBookmarked(true);
        onBookmarkToggle?.(post.id, true);
        toast.success('Added to bookmarks');
      }
    }
  };

  const handleLike = async () => {
    if (liked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId);

      if (!error) {
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        onLikeToggle(post.id, false);
        
        // Update post likes_count
        await supabase
          .from('posts')
          .update({ likes_count: Math.max(0, likesCount - 1) })
          .eq('id', post.id);
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: userId });

      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
        onLikeToggle(post.id, true);
        
        // Update post likes_count
        await supabase
          .from('posts')
          .update({ likes_count: likesCount + 1 })
          .eq('id', post.id);
      }
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data, error } = await supabase
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
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as unknown as Comment[]);
    }
    setLoadingComments(false);
  };

  const handleOpenComments = () => {
    setCommentsOpen(true);
    fetchComments();
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: userId,
        content: newComment.trim()
      });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
      setCommentCount(prev => prev + 1);
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(0, prev - 1));
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
    return `${days}d ago`;
  };

  const handleEditPost = async () => {
    if (!editContent.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase
      .from('posts')
      .update({
        title: editTitle.trim() || null,
        content: editContent.trim(),
        is_locked: editIsLocked,
      })
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to update post');
    } else {
      toast.success('Post updated');
      setEditOpen(false);
      onPostUpdated?.();
    }
    setIsUpdating(false);
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    
    // Delete media from storage if exists
    if (post.content_url) {
      const path = post.content_url.split('/post-media/')[1];
      if (path) {
        await supabase.storage.from('post-media').remove([path]);
      }
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to delete post');
    } else {
      toast.success('Post deleted');
      setDeleteOpen(false);
      onPostDeleted?.(post.id);
    }
    setIsDeleting(false);
  };

  // Share functionality
  const getPostUrl = () => {
    return `${window.location.origin}/post/${post.id}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPostUrl());
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareTwitter = () => {
    const text = post.title || post.content?.substring(0, 100) || 'Check out this post';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getPostUrl())}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostUrl())}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Check out this post',
          text: post.content?.substring(0, 100) || '',
          url: getPostUrl(),
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      setShareOpen(true);
    }
  };

  return (
    <>
      <GlassCard border="pink" hover="glow" className="relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer" 
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
          
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {!canView ? (
          <div className="relative">
            <div className="h-48 rounded-lg bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 blur-sm" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Lock className="w-10 h-10 text-neon-pink mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Subscribe to unlock</p>
              <NeonButton 
                variant="filled" 
                size="sm"
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
                  <video src={post.content_url} className="w-full max-h-80 object-cover rounded-lg" controls />
                ) : (
                  <img src={post.content_url} alt={post.title || 'Post'} className="w-full max-h-80 object-cover rounded-lg" />
                )}
              </div>
            )}
            {post.title && (
              <h3 className="font-semibold text-foreground mb-2">{post.title}</h3>
            )}
            <p className="text-foreground mb-4">{post.content}</p>
          </div>
        )}

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors ${
              liked ? 'text-neon-pink' : 'text-muted-foreground hover:text-neon-pink'
            }`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm">{likesCount}</span>
          </button>
          <button 
            onClick={handleOpenComments}
            className="flex items-center gap-2 text-muted-foreground hover:text-neon-cyan transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{commentCount}</span>
          </button>
          <button 
            onClick={handleBookmark}
            className={`flex items-center gap-2 transition-colors ${
              bookmarked ? 'text-neon-yellow' : 'text-muted-foreground hover:text-neon-yellow'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={handleNativeShare}
            className="flex items-center gap-2 text-muted-foreground hover:text-neon-purple transition-colors ml-auto"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </GlassCard>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-80 pr-4">
            {loadingComments ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No comments yet</div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {comment.user?.display_name || comment.user?.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(comment.created_at)}
                        </span>
                        {comment.user_id === userId && (
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground break-words">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
              disabled={submitting}
            />
            <NeonButton 
              variant="filled" 
              size="sm" 
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </NeonButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Title (optional)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={isUpdating}
            />
            <Textarea
              placeholder="What's on your mind?"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              disabled={isUpdating}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="edit-locked"
                checked={editIsLocked}
                onCheckedChange={setEditIsLocked}
                disabled={isUpdating}
              />
              <Label htmlFor="edit-locked" className="text-sm text-muted-foreground cursor-pointer">
                Subscribers only
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <NeonButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </NeonButton>
            <NeonButton 
              variant="filled" 
              size="sm" 
              onClick={handleEditPost}
              disabled={isUpdating || !editContent.trim()}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <NeonButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </NeonButton>
            <NeonButton 
              variant="filled" 
              size="sm" 
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Copy Link */}
            <div className="flex items-center gap-2">
              <Input
                value={getPostUrl()}
                readOnly
                className="flex-1 text-sm"
              />
              <NeonButton variant="cyan" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </NeonButton>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleShareTwitter}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                  <Twitter className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">Twitter</span>
              </button>
              
              <button
                onClick={handleShareFacebook}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">Facebook</span>
              </button>
              
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">Copy Link</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

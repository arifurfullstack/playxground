import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Eye, 
  EyeOff, 
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  Unlock,
  Image
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';

interface PostWithCreator {
  id: string;
  title: string | null;
  content: string | null;
  content_url: string | null;
  is_locked: boolean;
  is_hidden: boolean;
  likes_count: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ITEMS_PER_PAGE = 10;

export default function AdminPosts() {
  const { user: currentUser } = useAuth();
  const [posts, setPosts] = useState<PostWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog state
  const [selectedPost, setSelectedPost] = useState<PostWithCreator | null>(null);
  const [dialogAction, setDialogAction] = useState<'hide' | 'delete' | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          content_url,
          is_locked,
          is_hidden,
          likes_count,
          created_at,
          creator:profiles!posts_creator_id_fkey(id, username, display_name, avatar_url)
        `, { count: 'exact' });
      
      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }
      
      // Apply status filter
      if (statusFilter === 'hidden') {
        query = query.eq('is_hidden', true);
      } else if (statusFilter === 'visible') {
        query = query.eq('is_hidden', false);
      } else if (statusFilter === 'locked') {
        query = query.eq('is_locked', true);
      }
      
      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setPosts((data || []).map(p => ({
        ...p,
        is_hidden: p.is_hidden || false,
        creator: p.creator as PostWithCreator['creator'],
      })));
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);


  const handleHideToggle = async () => {
    if (!selectedPost) return;
    setProcessing(true);
    
    try {
      const newHiddenStatus = !selectedPost.is_hidden;
      
      const { error } = await supabase
        .from('posts')
        .update({ is_hidden: newHiddenStatus })
        .eq('id', selectedPost.id);
      
      if (error) throw error;
      
      toast.success(newHiddenStatus ? 'Post hidden from users' : 'Post is now visible');
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, is_hidden: newHiddenStatus } : p
      ));
      setDialogAction(null);
      setSelectedPost(null);
    } catch (error) {
      toast.error('Failed to update post');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    setProcessing(true);
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', selectedPost.id);
      
      if (error) throw error;
      
      toast.success('Post deleted successfully');
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setTotalCount(prev => prev - 1);
      setDialogAction(null);
      setSelectedPost(null);
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-display font-bold neon-text-yellow mb-2">
            Content Management
          </h1>
          <p className="text-muted-foreground">
            View and moderate all posts
          </p>
        </header>

        {/* Filters */}
        <GlassCard border="yellow" className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <NeonInput
                placeholder="Search posts by title or content..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-40 bg-secondary/50 border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-yellow" />
          </div>
        ) : posts.length === 0 ? (
          <GlassCard border="default" className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No posts found</p>
          </GlassCard>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard 
                    border={post.is_hidden ? 'default' : 'yellow'} 
                    className={post.is_hidden ? 'opacity-60' : ''}
                  >
                    <div className="flex items-start gap-4">
                      {/* Content Preview */}
                      <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {post.content_url ? (
                          <img src={post.content_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Post Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-foreground truncate">
                            {post.title || 'Untitled Post'}
                          </p>
                          {post.is_locked && (
                            <Lock className="w-4 h-4 text-neon-yellow flex-shrink-0" />
                          )}
                          {post.is_hidden && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {post.content || 'No content'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <Link 
                            to={`/profile/${post.creator.id}`}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan overflow-hidden">
                              {post.creator.avatar_url ? (
                                <img src={post.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3 h-3 m-1 text-background" />
                              )}
                            </div>
                            @{post.creator.username}
                          </Link>
                          <span>❤️ {post.likes_count}</span>
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link to={`/post/${post.id}`}>
                          <NeonButton variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </NeonButton>
                        </Link>
                        <NeonButton 
                          variant={post.is_hidden ? 'cyan' : 'ghost'} 
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setDialogAction('hide');
                          }}
                        >
                          {post.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </NeonButton>
                        <NeonButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setDialogAction('delete');
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </NeonButton>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <NeonButton
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </NeonButton>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <NeonButton
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </NeonButton>
              </div>
            )}
          </>
        )}

        {/* Hide/Show Dialog */}
        <Dialog open={dialogAction === 'hide'} onOpenChange={() => setDialogAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPost?.is_hidden ? 'Show Post' : 'Hide Post'}
              </DialogTitle>
              <DialogDescription>
                {selectedPost?.is_hidden 
                  ? 'This will make the post visible to users again.'
                  : 'This will hide the post from all users. Only admins can see hidden posts.'
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <NeonButton variant="ghost" onClick={() => setDialogAction(null)}>
                Cancel
              </NeonButton>
              <NeonButton 
                variant={selectedPost?.is_hidden ? 'filledCyan' : 'filled'} 
                onClick={handleHideToggle}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                  selectedPost?.is_hidden ? 'Show Post' : 'Hide Post'
                }
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={dialogAction === 'delete'} onOpenChange={() => setDialogAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Post</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this post? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <NeonButton variant="ghost" onClick={() => setDialogAction(null)}>
                Cancel
              </NeonButton>
              <NeonButton 
                variant="filled" 
                onClick={handleDelete}
                disabled={processing}
                className="bg-destructive hover:bg-destructive/90"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Post'}
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
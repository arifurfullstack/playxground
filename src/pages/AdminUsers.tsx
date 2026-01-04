import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  User, 
  Ban, 
  CheckCircle, 
  Shield, 
  UserCog,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye
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

interface UserWithRole {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_verified: boolean;
  created_at: string;
  role: 'admin' | 'creator' | 'fan';
}

const ITEMS_PER_PAGE = 10;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog state
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogAction, setDialogAction] = useState<'ban' | 'role' | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    
    try {
      // Build query
      let query = supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          is_banned,
          is_verified,
          created_at
        `, { count: 'exact' });
      
      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }
      
      // Apply status filter
      if (statusFilter === 'banned') {
        query = query.eq('is_banned', true);
      } else if (statusFilter === 'active') {
        query = query.eq('is_banned', false);
      }
      
      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const { data: profiles, count, error } = await query;
      
      if (error) throw error;
      
      // Fetch roles for these users
      const userIds = (profiles || []).map(p => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      let usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        ...p,
        is_banned: p.is_banned || false,
        role: (roleMap.get(p.id) as 'admin' | 'creator' | 'fan') || 'fan',
      }));
      
      // Apply role filter client-side (since roles are in separate table)
      if (roleFilter !== 'all') {
        usersWithRoles = usersWithRoles.filter(u => u.role === roleFilter);
      }
      
      setUsers(usersWithRoles);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const handleBanToggle = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    
    try {
      const newBanStatus = !selectedUser.is_banned;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: newBanStatus })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success(newBanStatus ? 'User banned successfully' : 'User unbanned successfully');
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, is_banned: newBanStatus } : u
      ));
      setDialogAction(null);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    setProcessing(true);
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'admin' | 'creator' | 'fan' })
        .eq('user_id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success('Role updated successfully');
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, role: newRole as UserWithRole['role'] } : u
      ));
      setDialogAction(null);
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-display font-bold neon-text-pink mb-2">
            User Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all platform users
          </p>
        </header>

        {/* Filters */}
        <GlassCard border="pink" className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <NeonInput
                placeholder="Search by username or display name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-40 bg-secondary/50 border-border">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-40 bg-secondary/50 border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
          </div>
        ) : users.length === 0 ? (
          <GlassCard border="default" className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No users found</p>
          </GlassCard>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard 
                    border={user.is_banned ? 'default' : 'pink'} 
                    className={user.is_banned ? 'opacity-60' : ''}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-background" />
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">
                            {user.display_name || user.username}
                          </p>
                          {user.is_verified && (
                            <CheckCircle className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                          )}
                          {user.is_banned && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                              Banned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {user.role}
                          </span>
                          <span>
                            Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${user.id}`}>
                          <NeonButton variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </NeonButton>
                        </Link>
                        <NeonButton 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setDialogAction('role');
                          }}
                        >
                          <UserCog className="w-4 h-4" />
                        </NeonButton>
                        <NeonButton 
                          variant={user.is_banned ? 'green' : 'ghost'} 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setDialogAction('ban');
                          }}
                        >
                          <Ban className="w-4 h-4" />
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

        {/* Ban/Unban Dialog */}
        <Dialog open={dialogAction === 'ban'} onOpenChange={() => setDialogAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.is_banned 
                  ? `Are you sure you want to unban @${selectedUser?.username}? They will be able to log in and create content again.`
                  : `Are you sure you want to ban @${selectedUser?.username}? They will not be able to log in or create content.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <NeonButton variant="ghost" onClick={() => setDialogAction(null)}>
                Cancel
              </NeonButton>
              <NeonButton 
                variant={selectedUser?.is_banned ? 'green' : 'filled'} 
                onClick={handleBanToggle}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                  selectedUser?.is_banned ? 'Unban User' : 'Ban User'
                }
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={dialogAction === 'role'} onOpenChange={() => setDialogAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for @{selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full bg-secondary/50 border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <NeonButton variant="ghost" onClick={() => setDialogAction(null)}>
                Cancel
              </NeonButton>
              <NeonButton 
                variant="filledCyan" 
                onClick={handleRoleChange}
                disabled={processing || newRole === selectedUser?.role}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Role'}
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
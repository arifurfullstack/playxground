import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, 
  User, 
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  reporter: {
    username: string;
    avatar_url: string | null;
  };
  reported_user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  reported_post?: {
    id: string;
    title: string | null;
    content: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 10;

export default function AdminReports() {
  const { user: currentUser } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_user_id,
          reported_post_id,
          reason,
          description,
          status,
          resolution_notes,
          created_at
        `, { count: 'exact' })
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      // Fetch related profiles/posts separately
      const reporterIds = [...new Set((data || []).map(r => r.reporter_id))];
      const userIds = [...new Set((data || []).filter(r => r.reported_user_id).map(r => r.reported_user_id!))];
      const postIds = [...new Set((data || []).filter(r => r.reported_post_id).map(r => r.reported_post_id!))];
      
      const [reportersRes, usersRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', reporterIds),
        userIds.length > 0 ? supabase.from('profiles').select('id, username, avatar_url').in('id', userIds) : { data: [] },
        postIds.length > 0 ? supabase.from('posts').select('id, title, content').in('id', postIds) : { data: [] },
      ]);
      
      const reporterMap = new Map((reportersRes.data || []).map(p => [p.id, p]));
      const userMap = new Map((usersRes.data || []).map(p => [p.id, p]));
      const postMap = new Map((postsRes.data || []).map(p => [p.id, p]));
      
      setReports((data || []).map(r => ({
        ...r,
        reporter: reporterMap.get(r.reporter_id) as Report['reporter'],
        reported_user: r.reported_user_id ? userMap.get(r.reported_user_id) as Report['reported_user'] : null,
        reported_post: r.reported_post_id ? postMap.get(r.reported_post_id) as Report['reported_post'] : null,
      })));
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time subscription for new reports
  useEffect(() => {
    const channel = supabase
      .channel('admin-reports')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reports',
      }, () => {
        if (activeTab === 'pending') {
          fetchReports();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, fetchReports]);

  const handleResolve = async (action: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    setProcessing(true);
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: action,
          resolved_by: currentUser!.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim() || null,
        })
        .eq('id', selectedReport.id);
      
      if (error) throw error;
      
      // Log admin action
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser!.id,
        action: action === 'resolved' ? 'resolve_report' : 'dismiss_report',
        target_type: 'report',
        target_id: selectedReport.id,
        details: { 
          reason: selectedReport.reason,
          resolution_notes: resolutionNotes.trim() || null,
        },
      });
      
      toast.success(action === 'resolved' ? 'Report resolved' : 'Report dismissed');
      setReports(prev => prev.filter(r => r.id !== selectedReport.id));
      setTotalCount(prev => prev - 1);
      setSelectedReport(null);
      setResolutionNotes('');
    } catch (error) {
      toast.error('Failed to update report');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getReportTypeIcon = (report: Report) => {
    if (report.reported_user_id) return <User className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getReportTarget = (report: Report) => {
    if (report.reported_user) {
      return (
        <Link 
          to={`/profile/${report.reported_user.id}`}
          className="flex items-center gap-2 hover:text-foreground"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan overflow-hidden">
            {report.reported_user.avatar_url ? (
              <img src={report.reported_user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3 h-3 m-1.5 text-background" />
            )}
          </div>
          @{report.reported_user.username}
        </Link>
      );
    }
    if (report.reported_post) {
      return (
        <Link 
          to={`/post/${report.reported_post.id}`}
          className="hover:text-foreground truncate"
        >
          {report.reported_post.title || 'Untitled Post'}
        </Link>
      );
    }
    return 'Unknown';
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-display font-bold neon-text-orange mb-2">
            Reports & Moderation
          </h1>
          <p className="text-muted-foreground">
            Review and take action on reported content and users
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Resolved
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-2">
              <XCircle className="w-4 h-4" />
              Dismissed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-neon-orange" />
              </div>
            ) : reports.length === 0 ? (
              <GlassCard border="default" className="text-center py-12">
                <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No {activeTab} reports</p>
              </GlassCard>
            ) : (
              <>
                <div className="space-y-3">
                  {reports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard border="default">
                        <div className="flex items-start gap-4">
                          {/* Type Icon */}
                          <div className="w-10 h-10 rounded-full bg-neon-orange/10 flex items-center justify-center flex-shrink-0">
                            {getReportTypeIcon(report)}
                          </div>
                          
                          {/* Report Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange">
                                {report.reason}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <span className="text-muted-foreground">Reported:</span>
                              {getReportTarget(report)}
                            </div>
                            
                            {report.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {report.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>By:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-secondary overflow-hidden">
                                  {report.reporter.avatar_url ? (
                                    <img src={report.reporter.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-2 h-2 m-1 text-muted-foreground" />
                                  )}
                                </div>
                                @{report.reporter.username}
                              </div>
                            </div>
                            
                            {report.resolution_notes && (
                              <p className="text-xs text-muted-foreground mt-2 p-2 bg-secondary/50 rounded">
                                <span className="font-medium">Notes:</span> {report.resolution_notes}
                              </p>
                            )}
                          </div>
                          
                          {/* Actions */}
                          {activeTab === 'pending' && (
                            <div className="flex items-center gap-2">
                              <NeonButton 
                                variant="green" 
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Review
                              </NeonButton>
                            </div>
                          )}
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
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
              <DialogDescription>
                Take action on this report
              </DialogDescription>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">Reason:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange">
                      {selectedReport.reason}
                    </span>
                  </div>
                  {selectedReport.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.description}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">Target: </span>
                    {getReportTarget(selectedReport)}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Resolution Notes (optional)
                  </label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    className="bg-background/50"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <NeonButton variant="ghost" onClick={() => setSelectedReport(null)}>
                Cancel
              </NeonButton>
              <NeonButton 
                variant="cyan" 
                onClick={() => handleResolve('dismissed')}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dismiss'}
              </NeonButton>
              <NeonButton 
                variant="green" 
                onClick={() => handleResolve('resolved')}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resolve'}
              </NeonButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
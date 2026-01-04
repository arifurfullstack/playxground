import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Flag,
  DollarSign,
  TrendingUp,
  UserCheck,
  Clock,
  BarChart3,
  Settings,
  PieChart,
  Crown,
  Save,
  ChevronRight
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, BarChart, Bar, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalCreators: number;
  totalPosts: number;
  pendingReports: number;
  totalTransactions: number;
  recentActivity: ActivityItem[];
  weeklyUsers: number;
  weeklyPosts: number;
  monthlyRevenue: number;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'post' | 'report' | 'transaction';
  description: string;
  created_at: string;
}

interface ChartDataPoint {
  date: string;
  label: string;
  users: number;
  posts: number;
  transactions: number;
  revenue: number;
}

interface TopSpender {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_spent: number;
}

interface RevenueSplit {
  suga4u: number;
  truth_or_dare: number;
  bar_lounge: number;
  confessions: number;
  tips: number;
}

const chartConfig = {
  users: { label: "Users", color: "hsl(var(--neon-pink))" },
  posts: { label: "Posts", color: "hsl(var(--neon-cyan))" },
  transactions: { label: "Transactions", color: "hsl(var(--neon-green))" },
  revenue: { label: "Revenue", color: "hsl(var(--neon-yellow))" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalCreators: 0, totalPosts: 0, pendingReports: 0,
    totalTransactions: 0, recentActivity: [], weeklyUsers: 0, weeklyPosts: 0, monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [splits, setSplits] = useState<RevenueSplit>({
    suga4u: 10, truth_or_dare: 10, bar_lounge: 10, confessions: 10, tips: 10
  });
  const [savingSplits, setSavingSplits] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTopSpenders();
    fetchSplits();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartPeriod]);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      const [
        usersRes, creatorsRes, postsRes, reportsRes, transactionsRes,
        recentUsersRes, weeklyUsersRes, weeklyPostsRes, monthlyTransactionsRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'creator'),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, username, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('transactions').select('amount').gte('created_at', monthAgo.toISOString()),
      ]);

      const monthlyRevenue = (monthlyTransactionsRes.data || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalUsers: usersRes.count || 0,
        totalCreators: creatorsRes.count || 0,
        totalPosts: postsRes.count || 0,
        pendingReports: reportsRes.count || 0,
        totalTransactions: transactionsRes.count || 0,
        recentActivity: (recentUsersRes.data || []).map(user => ({
          id: user.id, type: 'user', description: `New user @${user.username} registered`, created_at: user.created_at,
        })),
        weeklyUsers: weeklyUsersRes.count || 0,
        weeklyPosts: weeklyPostsRes.count || 0,
        monthlyRevenue,
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchChartData = async () => {
    try {
      const daysBack = chartPeriod === 'week' ? 7 : 30;
      const startDate = startOfDay(subDays(new Date(), daysBack - 1));
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });

      const [usersRes, postsRes, transRes] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('posts').select('created_at').gte('created_at', startDate.toISOString()),
        supabase.from('transactions').select('created_at, amount').gte('created_at', startDate.toISOString()),
      ]);

      const dataMap = new Map<string, { u: 0, p: 0, t: 0, r: 0 }>();
      (usersRes.data || []).forEach(u => {
        const d = format(new Date(u.created_at), 'yyyy-MM-dd');
        const v = dataMap.get(d) || { u: 0, p: 0, t: 0, r: 0 }; v.u++; dataMap.set(d, v);
      });
      (postsRes.data || []).forEach(p => {
        const d = format(new Date(p.created_at), 'yyyy-MM-dd');
        const v = dataMap.get(d) || { u: 0, p: 0, t: 0, r: 0 }; v.p++; dataMap.set(d, v);
      });
      (transRes.data || []).forEach(t => {
        const d = format(new Date(t.created_at), 'yyyy-MM-dd');
        const v = dataMap.get(d) || { u: 0, p: 0, t: 0, r: 0 }; v.t++; v.r += Number(t.amount); dataMap.set(d, v);
      });

      setChartData(dateRange.map(d => {
        const ds = format(d, 'yyyy-MM-dd');
        const v = dataMap.get(ds) || { u: 0, p: 0, t: 0, r: 0 };
        return {
          date: ds, label: chartPeriod === 'week' ? format(d, 'EEE') : format(d, 'MMM d'),
          users: v.u, posts: v.p, transactions: v.t, revenue: v.r
        };
      }));
    } catch (e) { console.error(e); }
  };

  const fetchTopSpenders = async () => {
    try {
      // Aggregate transactions where sender is a fan
      const { data, error } = await supabase
        .from('transactions')
        .select('sender_id, amount, profiles!transactions_sender_id_fkey(username, display_name, avatar_url)')
        .not('sender_id', 'is', null);

      if (error) throw error;

      const spMap = new Map<string, TopSpender>();
      data?.forEach(t => {
        const prof = t.profiles as any;
        if (!prof) return;
        const s = spMap.get(t.sender_id!) || { id: t.sender_id!, username: prof.username, display_name: prof.display_name, avatar_url: prof.avatar_url, total_spent: 0 };
        s.total_spent += Number(t.amount);
        spMap.set(t.sender_id!, s);
      });

      setTopSpenders([...spMap.values()].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10));
    } catch (e) { console.error(e); }
  };

  const fetchSplits = async () => {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'revenue_splits').single();
    if (data?.value) setSplits(data.value as any);
  };

  const saveSplits = async () => {
    setSavingSplits(true);
    const { error } = await supabase.from('platform_settings').update({ value: splits }).eq('key', 'revenue_splits');
    if (error) toast.error("Failed to update splits");
    else toast.success("Revenue splits updated");
    setSavingSplits(false);
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-neon-pink', border: 'pink' as const },
    { label: 'Creators', value: stats.totalCreators, icon: UserCheck, color: 'text-neon-cyan', border: 'cyan' as const },
    { label: 'Revenue (30d)', value: `$${stats.monthlyRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-neon-yellow', border: 'yellow' as const },
    { label: 'Reports', value: stats.pendingReports, icon: Flag, color: 'text-neon-orange', border: 'default' as const },
    { label: 'Transactions', value: stats.totalTransactions, icon: TrendingUp, color: 'text-neon-green', border: 'green' as const },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold neon-text-cyan mb-2">Platform Hub</h1>
            <p className="text-muted-foreground">Comprehensive overview of financials, creators, and growth</p>
          </div>
          <div className="flex gap-2">
            <GlassCard className="px-4 py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> <span className="text-xs font-bold uppercase tracking-widest">System Live</span></GlassCard>
          </div>
        </header>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-black/40 border border-white/5 p-1 rounded-xl h-auto flex-wrap">
            <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
            <TabsTrigger value="revenue" className="px-6 py-2">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="spenders" className="px-6 py-2">Suga Daddys</TabsTrigger>
            <TabsTrigger value="splits" className="px-6 py-2">Room Splits</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <GlassCard border={stat.border} className="text-center p-5">
                    <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{stat.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <GlassCard border="cyan" className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="flex items-center gap-2 font-bold"><BarChart3 className="w-5 h-5 text-neon-cyan" /> Growth Overview</h2>
                  <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}><TabsList><TabsTrigger value="week" className="text-xs">W</TabsTrigger><TabsTrigger value="month" className="text-xs">M</TabsTrigger></TabsList></Tabs>
                </div>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <AreaChart data={chartData}><defs><linearGradient id="fillU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--neon-pink))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--neon-pink))" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} /><YAxis hide /><ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="users" stroke="hsl(var(--neon-pink))" strokeWidth={3} fill="url(#fillU)" /></AreaChart>
                </ChartContainer>
              </GlassCard>
              <GlassCard border="pink" className="p-6">
                <h2 className="flex items-center gap-2 font-bold mb-6"><Clock className="w-5 h-5 text-neon-pink" /> Recent Activity</h2>
                <div className="space-y-4">
                  {stats.recentActivity.map(a => (
                    <div key={a.id} className="flex gap-3 items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><UserCheck className="w-4 h-4 text-neon-cyan" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{a.description}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* REVENUE ANALYSIS */}
          <TabsContent value="revenue" className="space-y-6 animate-in fade-in duration-500">
            <div className="grid lg:grid-cols-2 gap-6">
              <GlassCard border="yellow" className="p-6">
                <h2 className="flex items-center gap-2 font-bold mb-6"><DollarSign className="w-5 h-5 text-neon-yellow" /> Revenue Trend</h2>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={chartData}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><YAxis hide /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="hsl(var(--neon-yellow))" radius={[4, 4, 0, 0]} /></BarChart>
                </ChartContainer>
              </GlassCard>
              <GlassCard border="green" className="p-6">
                <h2 className="flex items-center gap-2 font-bold mb-6"><PieChart className="w-5 h-5 text-neon-green" /> Category Distribution</h2>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={[{ name: 'Suga 4 U', value: 40 }, { name: 'Truth/Dare', value: 25 }, { name: 'Bar Lounge', value: 15 }, { name: 'Confessions', value: 10 }, { name: 'Tips', value: 10 }]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        <Cell fill="hsl(var(--neon-pink))" /><Cell fill="hsl(var(--neon-cyan))" /><Cell fill="hsl(var(--neon-purple))" /><Cell fill="hsl(var(--neon-orange))" /><Cell fill="hsl(var(--neon-green))" />
                      </Pie><ChartTooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* SUGA DADDYS (TOP SPENDERS) */}
          <TabsContent value="spenders" className="animate-in fade-in duration-500">
            <GlassCard border="cyan" className="p-0 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold"><Crown className="w-5 h-5 text-yellow-400" /> Top Spenders (Suga Daddys)</h2>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Ranked by Lifetime Spend</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Total Spent</th><th className="px-6 py-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topSpenders.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden border border-white/10">{s.avatar_url && <img src={s.avatar_url} className="w-full h-full object-cover" />}</div>
                          <div><p className="text-sm font-medium">@{s.username}</p><p className="text-[10px] text-muted-foreground">{s.display_name}</p></div>
                        </td>
                        <td className="px-6 py-4"><span className="text-sm font-bold text-neon-green">${s.total_spent.toFixed(2)}</span></td>
                        <td className="px-6 py-4">{idx < 3 ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold uppercase tracking-widest">Whale</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 uppercase font-bold tracking-widest">Premium</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topSpenders.length === 0 && <div className="p-10 text-center text-muted-foreground">No transaction data found</div>}
              </div>
            </GlassCard>
          </TabsContent>

          {/* REVENUE SPLITS (SETTINGS) */}
          <TabsContent value="splits" className="animate-in fade-in duration-500">
            <div className="grid md:grid-cols-2 gap-8">
              <GlassCard border="pink" className="p-6 space-y-6">
                <div>
                  <h2 className="flex items-center gap-2 font-bold mb-2"><Settings className="w-5 h-5 text-neon-pink" /> Revenue Split Controls</h2>
                  <p className="text-xs text-muted-foreground">Adjust the percentage share that the <b>Platform</b> keeps for each activity. Remaining percentage goes to the Creator.</p>
                </div>

                <div className="space-y-4 pt-4">
                  {Object.entries(splits).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-fuchsia-300">{key.replace('_', ' ')}</span>
                        <span>{value}% Platform / {100 - value}% Creator</span>
                      </div>
                      <input type="range" min="0" max="100" value={value} onChange={(e) => setSplits({ ...splits, [key]: parseInt(e.target.value) })} className="w-full accent-fuchsia-500 bg-white/10 rounded-lg h-2 appearance-none cursor-pointer" />
                    </div>
                  ))}
                </div>

                <button onClick={saveSplits} disabled={savingSplits} className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all shadow-lg shadow-fuchsia-900/20 flex items-center justify-center gap-2">
                  {savingSplits ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />} Save Split Settings
                </button>
              </GlassCard>

              <div className="space-y-6">
                <GlassCard border="cyan" className="p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-neon-cyan"><TrendingUp className="w-4 h-4" /> Pricing Strategy Advice</h3>
                  <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                    <li className="flex gap-2"><ChevronRight className="w-3 h-3 flex-shrink-0 text-neon-cyan mt-1" /> <b>Creator Retention</b>: Industry standards for high-end boutique platforms are 80-90% for creators.</li>
                    <li className="flex gap-2"><ChevronRight className="w-3 h-3 flex-shrink-0 text-neon-cyan mt-1" /> <b>Operational Costs</b>: Ensure the platform share covers hosting, the 10% processing fees, and support.</li>
                    <li className="flex gap-2"><ChevronRight className="w-3 h-3 flex-shrink-0 text-neon-cyan mt-1" /> <b>Experimental</b>: You can temporarily lower the platform split to 0% to incentivize new creators during launch.</li>
                  </ul>
                </GlassCard>
                <GlassCard className="p-6 border-white/5 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10">
                  <h3 className="font-bold mb-2">Audit Log</h3>
                  <p className="text-xs text-muted-foreground">Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}</p>
                </GlassCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
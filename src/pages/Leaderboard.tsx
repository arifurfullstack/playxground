import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Crown, TrendingUp, Heart, Loader2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_amount: number;
  transaction_count: number;
}

type TimePeriod = "all" | "monthly" | "weekly";

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [topCreators, setTopCreators] = useState<LeaderboardEntry[]>([]);
  const [topFans, setTopFans] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchLeaderboards();
    }
  }, [user, authLoading, navigate, timePeriod]);

  const getDateFilter = () => {
    const now = new Date();
    if (timePeriod === "weekly") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo.toISOString();
    }
    if (timePeriod === "monthly") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return monthAgo.toISOString();
    }
    return null;
  };

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTopCreators(), fetchTopFans()]);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopCreators = async () => {
    const dateFilter = getDateFilter();
    
    let query = supabase
      .from("transactions")
      .select("receiver_id, amount, created_at")
      .not("receiver_id", "is", null);

    if (dateFilter) {
      query = query.gte("created_at", dateFilter);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    const earningsMap = new Map<string, { total: number; count: number }>();
    transactions?.forEach((tx) => {
      if (tx.receiver_id) {
        const existing = earningsMap.get(tx.receiver_id) || { total: 0, count: 0 };
        earningsMap.set(tx.receiver_id, {
          total: existing.total + Number(tx.amount),
          count: existing.count + 1,
        });
      }
    });

    const topEarners = Array.from(earningsMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    if (topEarners.length === 0) {
      setTopCreators([]);
      return;
    }

    const userIds = topEarners.map(([id]) => id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map((p) => [p.id, p]));
    const leaderboard: LeaderboardEntry[] = topEarners.map(([userId, data]) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        username: profile?.username || "Unknown",
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        total_amount: data.total,
        transaction_count: data.count,
      };
    });

    setTopCreators(leaderboard);
  };

  const fetchTopFans = async () => {
    const dateFilter = getDateFilter();
    
    let query = supabase
      .from("transactions")
      .select("sender_id, amount, created_at")
      .not("sender_id", "is", null);

    if (dateFilter) {
      query = query.gte("created_at", dateFilter);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    const spendingMap = new Map<string, { total: number; count: number }>();
    transactions?.forEach((tx) => {
      if (tx.sender_id) {
        const existing = spendingMap.get(tx.sender_id) || { total: 0, count: 0 };
        spendingMap.set(tx.sender_id, {
          total: existing.total + Number(tx.amount),
          count: existing.count + 1,
        });
      }
    });

    const topSpenders = Array.from(spendingMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    if (topSpenders.length === 0) {
      setTopFans([]);
      return;
    }

    const userIds = topSpenders.map(([id]) => id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map((p) => [p.id, p]));
    const leaderboard: LeaderboardEntry[] = topSpenders.map(([userId, data]) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        username: profile?.username || "Unknown",
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        total_amount: data.total,
        transaction_count: data.count,
      };
    });

    setTopFans(leaderboard);
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-gray-400/50";
    if (rank === 3) return "bg-gradient-to-r from-orange-600/20 to-amber-700/20 border-orange-600/50";
    return "bg-card/50";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getTimePeriodLabel = () => {
    if (timePeriod === "weekly") return "This Week";
    if (timePeriod === "monthly") return "This Month";
    return "All Time";
  };

  const renderLeaderboardList = (entries: LeaderboardEntry[], type: "creators" | "fans") => {
    if (entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No data for {getTimePeriodLabel().toLowerCase()}. Be the first!</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const rank = index + 1;
          return (
            <GlassCard
              key={entry.user_id}
              className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${getRankStyle(rank)}`}
              onClick={() => navigate(`/profile/${entry.user_id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(rank)}
                </div>
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {entry.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {entry.display_name || entry.username}
                  </p>
                  <p className="text-sm text-muted-foreground">@{entry.username}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-lg">
                    ${entry.total_amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.transaction_count} {type === "creators" ? "earnings" : "tips"}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="creators" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="creators" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Creators
            </TabsTrigger>
            <TabsTrigger value="fans" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Top Fans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creators">
            <GlassCard className="p-4 mb-4">
              <p className="text-sm text-muted-foreground text-center">
                Top creators ranked by total earnings ({getTimePeriodLabel().toLowerCase()})
              </p>
            </GlassCard>
            {renderLeaderboardList(topCreators, "creators")}
          </TabsContent>

          <TabsContent value="fans">
            <GlassCard className="p-4 mb-4">
              <p className="text-sm text-muted-foreground text-center">
                Top fans ranked by total spending ({getTimePeriodLabel().toLowerCase()})
              </p>
            </GlassCard>
            {renderLeaderboardList(topFans, "fans")}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;

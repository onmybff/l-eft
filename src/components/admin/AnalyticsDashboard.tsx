import { useState, useEffect } from 'react';
import { TrendingUp, Users, FileText, Heart, MessageCircle, UserPlus, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DailyMetric {
  date: string;
  count: number;
}

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  newUsersToday: number;
  postsToday: number;
  dailyPosts: DailyMetric[];
  dailyUsers: DailyMetric[];
}

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();
    const sevenDaysAgo = subDays(today, 7).toISOString();

    const [
      usersRes,
      postsRes,
      likesRes,
      commentsRes,
      newUsersTodayRes,
      postsTodayRes,
      recentPostsRes,
      recentUsersRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('likes').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      supabase.from('posts').select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      supabase.from('posts').select('created_at').gte('created_at', sevenDaysAgo),
      supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo),
    ]);

    // Process daily metrics
    const dailyPosts = processDaily(recentPostsRes.data || []);
    const dailyUsers = processDaily(recentUsersRes.data || []);

    setAnalytics({
      totalUsers: usersRes.count || 0,
      totalPosts: postsRes.count || 0,
      totalLikes: likesRes.count || 0,
      totalComments: commentsRes.count || 0,
      newUsersToday: newUsersTodayRes.count || 0,
      postsToday: postsTodayRes.count || 0,
      dailyPosts,
      dailyUsers,
    });

    setLoading(false);
  };

  const processDaily = (data: { created_at: string }[]): DailyMetric[] => {
    const counts: Record<string, number> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM dd');
      counts[date] = 0;
    }
    
    // Count items per day
    data.forEach(item => {
      const date = format(new Date(item.created_at), 'MMM dd');
      if (counts[date] !== undefined) {
        counts[date]++;
      }
    });

    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', analytics.totalUsers.toString()],
      ['Total Posts', analytics.totalPosts.toString()],
      ['Total Likes', analytics.totalLikes.toString()],
      ['Total Comments', analytics.totalComments.toString()],
      ['New Users Today', analytics.newUsersToday.toString()],
      ['Posts Today', analytics.postsToday.toString()],
      ['Avg Likes/Post', analytics.totalPosts > 0 ? (analytics.totalLikes / analytics.totalPosts).toFixed(2) : '0'],
      ['Avg Comments/Post', analytics.totalPosts > 0 ? (analytics.totalComments / analytics.totalPosts).toFixed(2) : '0'],
      ['Posts/User', analytics.totalUsers > 0 ? (analytics.totalPosts / analytics.totalUsers).toFixed(2) : '0'],
      [],
      ['Daily Posts (Last 7 Days)'],
      ['Date', 'Count'],
      ...analytics.dailyPosts.map(d => [d.date, d.count.toString()]),
      [],
      ['Daily Users (Last 7 Days)'],
      ['Date', 'Count'],
      ...analytics.dailyUsers.map(d => [d.date, d.count.toString()]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'Analytics exported to CSV' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const metrics = [
    { label: 'Total Users', value: analytics.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Total Posts', value: analytics.totalPosts, icon: FileText, color: 'text-green-500' },
    { label: 'Total Likes', value: analytics.totalLikes, icon: Heart, color: 'text-red-500' },
    { label: 'Total Comments', value: analytics.totalComments, icon: MessageCircle, color: 'text-purple-500' },
    { label: 'New Users Today', value: analytics.newUsersToday, icon: UserPlus, color: 'text-cyan-500' },
    { label: 'Posts Today', value: analytics.postsToday, icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Posts (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-1">
              {analytics.dailyPosts.map((day) => {
                const maxCount = Math.max(...analytics.dailyPosts.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{day.date.split(' ')[1]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">New Users (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-1">
              {analytics.dailyUsers.map((day) => {
                const maxCount = Math.max(...analytics.dailyUsers.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-blue-500/80 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{day.date.split(' ')[1]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Rate */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Engagement Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {analytics.totalPosts > 0 
                  ? (analytics.totalLikes / analytics.totalPosts).toFixed(1) 
                  : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Likes/Post</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {analytics.totalPosts > 0 
                  ? (analytics.totalComments / analytics.totalPosts).toFixed(1) 
                  : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Comments/Post</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {analytics.totalUsers > 0 
                  ? (analytics.totalPosts / analytics.totalUsers).toFixed(1) 
                  : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Posts/User</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreatePost } from '@/components/posts/CreatePost';
import { PostCard } from '@/components/posts/PostCard';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FeedType = 'following' | 'foryou';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [forYouPosts, setForYouPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedType>('foryou');

  const fetchPosts = async () => {
    setIsLoading(true);
    
    // Fetch "For You" posts - popular/recent posts sorted by engagement
    // Filter out flagged posts so they don't appear in the feed
    const { data: popularData } = await supabase
      .from('posts')
      .select(`
        *,
        likes (count),
        comments (count)
      `)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch profiles separately and join them
    if (popularData && popularData.length > 0) {
      const userIds = [...new Set(popularData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      // Attach profiles to posts
      popularData.forEach(post => {
        (post as any).profiles = profilesMap.get(post.user_id) || null;
      });
    }

    if (popularData && user) {
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

      // Sort by engagement score for "For You"
      const postsWithEngagement = popularData.map(post => {
        const likesCount = post.likes?.[0]?.count || 0;
        const commentsCount = post.comments?.[0]?.count || 0;
        const engagementScore = likesCount * 2 + commentsCount * 3;
        return {
          ...post,
          user_has_liked: likedPostIds.has(post.id),
          engagementScore,
        };
      });

      // Sort by engagement for "For You" feed
      const sortedByEngagement = [...postsWithEngagement].sort((a, b) => b.engagementScore - a.engagementScore);
      setForYouPosts(sortedByEngagement as unknown as Post[]);

      // "Following" feed - only posts from people user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        const followingPosts = postsWithEngagement.filter(
          post => followingIds.includes(post.user_id) || post.user_id === user.id
        );
        setPosts(followingPosts as unknown as Post[]);
      } else {
        // If not following anyone, show user's own posts
        const ownPosts = postsWithEngagement.filter(post => post.user_id === user.id);
        setPosts(ownPosts as unknown as Post[]);
      }
    } else if (popularData) {
      setForYouPosts(popularData as unknown as Post[]);
      setPosts([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const currentPosts = activeTab === 'foryou' ? forYouPosts : posts;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 glass border-b border-border">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedType)} className="w-full">
            <TabsList className="w-full h-14 bg-transparent border-b border-border rounded-none p-0">
              <TabsTrigger 
                value="foryou" 
                className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
              >
                For You
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <CreatePost onPostCreated={fetchPosts} />

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : currentPosts.length > 0 ? (
          <div>
            {currentPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={fetchPosts}
                onLikeChange={fetchPosts}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-lg mb-2">
              {activeTab === 'following' ? 'No posts from people you follow' : 'No posts yet'}
            </p>
            <p>
              {activeTab === 'following' 
                ? 'Follow some people to see their posts here!' 
                : 'Be the first to share something!'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

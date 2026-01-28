import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreatePost } from '@/components/posts/CreatePost';
import { PostCard } from '@/components/posts/PostCard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (*),
        likes (count),
        comments (count)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && user) {
      // Check which posts the current user has liked
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

      const postsWithLikeStatus = data.map(post => ({
        ...post,
        user_has_liked: likedPostIds.has(post.id),
      }));

      setPosts(postsWithLikeStatus as unknown as Post[]);
    } else if (data) {
      setPosts(data as unknown as Post[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        <header className="sticky top-0 z-10 glass border-b border-border p-4">
          <h1 className="text-xl font-bold">Home</h1>
        </header>

        <CreatePost onPostCreated={fetchPosts} />

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length > 0 ? (
          <div>
            {posts.map((post) => (
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
            <p className="text-lg mb-2">No posts yet</p>
            <p>Be the first to share something!</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

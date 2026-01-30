import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { CommentSection } from '@/components/posts/CommentSection';
import { Button } from '@/components/ui/button';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [postId, user]);

  const fetchPost = async () => {
    if (!postId) return;

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (*),
        likes (count),
        comments (count)
      `)
      .eq('id', postId)
      .maybeSingle();

    if (data && user) {
      const { data: userLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      setPost({
        ...data,
        user_has_liked: !!userLike,
      } as unknown as Post);
    } else if (data) {
      setPost(data as unknown as Post);
    }

    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 glass border-b border-border p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Post</h1>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : post ? (
          <>
            <PostCard
              post={post}
              onDelete={() => navigate('/')}
              onLikeChange={fetchPost}
              showComments={false}
            />
            <CommentSection postId={post.id} />
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Post not found
          </div>
        )}
      </div>
    </MainLayout>
  );
}

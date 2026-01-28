import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2 } from 'lucide-react';
import { Comment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data as unknown as Comment[]);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsLoading(true);

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
    }

    setIsLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    
    if (error) {
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    } else {
      fetchComments();
    }
  };

  return (
    <div className="border-t border-border">
      {user && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {profile?.username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-input border-border"
              />
              <Button
                type="submit"
                disabled={isLoading || !newComment.trim()}
                size="icon"
                className="gradient-bg text-primary-foreground"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="divide-y divide-border">
        {comments.map((comment) => (
          <div key={comment.id} className="p-4 animate-fade-in">
            <div className="flex gap-3">
              <Link to={`/user/${comment.profiles?.username}`}>
                <Avatar className="w-10 h-10 hover-lift">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {comment.profiles?.username?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/user/${comment.profiles?.username}`}
                      className="font-semibold hover:underline"
                    >
                      {comment.profiles?.display_name || comment.profiles?.username}
                    </Link>
                    <span className="text-muted-foreground text-sm">
                      @{comment.profiles?.username}
                    </span>
                    <span className="text-muted-foreground text-sm">·</span>
                    <span className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(comment.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-1">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}

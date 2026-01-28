import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
  onLikeChange?: () => void;
  showComments?: boolean;
}

export function PostCard({ post, onDelete, onLikeChange, showComments = true }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(post.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes?.[0]?.count || 0);
  const [isLoading, setIsLoading] = useState(false);

  const profile = post.profiles;
  const commentsCount = post.comments?.[0]?.count || 0;
  const isOwner = user?.id === post.user_id;

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Please sign in to like posts', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (!error) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        onLikeChange?.();
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });

      if (!error) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        onLikeChange?.();
      }
    }
    
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    
    if (error) {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    } else {
      toast({ title: 'Post deleted' });
      onDelete?.();
    }
  };

  return (
    <article className="p-4 border-b border-border hover:bg-card/50 transition-colors animate-fade-in">
      <div className="flex gap-3">
        <Link to={`/user/${profile?.username}`}>
          <Avatar className="w-12 h-12 hover-lift">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {profile?.username?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Link 
                to={`/user/${profile?.username}`}
                className="font-semibold hover:underline truncate"
              >
                {profile?.display_name || profile?.username}
              </Link>
              <Link 
                to={`/user/${profile?.username}`}
                className="text-muted-foreground text-sm truncate"
              >
                @{profile?.username}
              </Link>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border">
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {post.content && (
            <p className="mt-2 whitespace-pre-wrap break-words">{post.content}</p>
          )}

          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <img 
                src={post.image_url} 
                alt="Post image" 
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={handleLike}
              disabled={isLoading}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isLiked 
                  ? 'text-pink-500' 
                  : 'text-muted-foreground hover:text-pink-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>

            {showComments && (
              <Link 
                to={`/post/${post.id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{commentsCount}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

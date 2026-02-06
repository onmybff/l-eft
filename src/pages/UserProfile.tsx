import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Post } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = currentUserProfile?.username === username;

  useEffect(() => {
    if (isOwnProfile) {
      navigate('/profile');
      return;
    }
    fetchUserData();
  }, [username, user]);

  const fetchUserData = async () => {
    if (!username) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!profileData) {
      setIsLoading(false);
      return;
    }

    setProfile(profileData as Profile);

    // Fetch posts - filter out flagged posts
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        likes (count),
        comments (count)
      `)
      .eq('user_id', profileData.user_id)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    // Attach profile to posts
    if (postsData) {
      postsData.forEach(post => {
        (post as any).profiles = profileData;
      });

      if (user) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

        const postsWithLikeStatus = postsData.map(post => ({
          ...post,
          user_has_liked: likedPostIds.has(post.id),
        }));

        setPosts(postsWithLikeStatus as unknown as Post[]);
      } else {
        setPosts(postsData as unknown as Post[]);
      }
    }

    // Check if following
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.user_id)
        .maybeSingle();

      setIsFollowing(!!followData);
    }

    // Fetch followers count
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileData.user_id);
    setFollowersCount(followers || 0);

    // Fetch following count
    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileData.user_id);
    setFollowingCount(following || 0);

    setIsLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) {
      toast({ title: 'Please sign in to follow users', variant: 'destructive' });
      return;
    }

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.user_id);

      if (!error) {
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: profile.user_id });

      if (!error) {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    }
  };

  const handleMessage = async () => {
    if (!user || !profile) {
      toast({ title: 'Please sign in to send messages', variant: 'destructive' });
      return;
    }

    // Check for existing conversation
    const { data: existingConvos } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingConvos) {
      for (const convo of existingConvos) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convo.conversation_id)
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (otherParticipant) {
          navigate(`/messages/${convo.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convoError || !newConvo) {
      toast({ title: 'Failed to create conversation', variant: 'destructive' });
      return;
    }

    // Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConvo.id, user_id: user.id },
    ]);

    // Second participant will need to be added when they first message
    navigate(`/messages/${newConvo.id}?new=${profile.user_id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 glass border-b border-border p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{profile?.display_name || username}</h1>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <>
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <Avatar className="w-24 h-24 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleMessage}
                    className="border-border"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleFollow}
                    className={isFollowing 
                      ? 'bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground' 
                      : 'gradient-bg text-primary-foreground'
                    }
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                </div>
              </div>

              <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
              <p className="text-muted-foreground">@{profile.username}</p>

              {profile.bio && (
                <p className="mt-3 whitespace-pre-wrap">{profile.bio}</p>
              )}

              <div className="flex gap-4 mt-4 text-sm">
                <span>
                  <strong>{followingCount}</strong>{' '}
                  <span className="text-muted-foreground">Following</span>
                </span>
                <span>
                  <strong>{followersCount}</strong>{' '}
                  <span className="text-muted-foreground">Followers</span>
                </span>
              </div>
            </div>

            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={fetchUserData}
                />
              ))}

              {posts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No posts yet
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            User not found
          </div>
        )}
      </div>
    </MainLayout>
  );
}

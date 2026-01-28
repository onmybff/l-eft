import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
  });
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchUserData();
  }, [user, profile]);

  const fetchUserData = async () => {
    if (!user) return;

    // Fetch posts
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (*),
        likes (count),
        comments (count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (postsData) {
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
    }

    // Fetch followers count
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);
    setFollowersCount(followers || 0);

    // Fetch following count
    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);
    setFollowingCount(following || 0);

    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }

    setIsLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: editForm.display_name || null,
        bio: editForm.bio || null,
        avatar_url: editForm.avatar_url || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!' });
      refreshProfile();
      setIsEditing(false);
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        <header className="sticky top-0 z-10 glass border-b border-border p-4">
          <h1 className="text-xl font-bold">Profile</h1>
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

                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-border">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Avatar URL</Label>
                        <Input
                          value={editForm.avatar_url}
                          onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                          placeholder="https://..."
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={editForm.display_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="bg-input border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Tell us about yourself..."
                          className="bg-input border-border resize-none"
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleUpdateProfile}
                        className="w-full gradient-bg text-primary-foreground"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
        ) : null}
      </div>
    </MainLayout>
  );
}

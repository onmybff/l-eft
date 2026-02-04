import { useState, useEffect } from 'react';
import { Flag, Trash2, EyeOff, AlertTriangle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Post, Profile } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface PostWithProfile extends Post {
  profile?: Profile;
}

const POSTS_PER_PAGE = 10;

export function PostModeration() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagReason, setFlagReason] = useState('');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showFlagged, setShowFlagged] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [showFlagged, currentPage]);

  const fetchPosts = async () => {
    setLoading(true);
    
    const from = (currentPage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;
    
    // Get total count first
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });
    
    if (showFlagged) {
      countQuery = countQuery.eq('is_flagged', true);
    }
    
    const { count } = await countQuery;
    setTotalCount(count || 0);
    
    // Fetch paginated posts
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (showFlagged) {
      query = query.eq('is_flagged', true);
    }

    const [postsRes, profilesRes] = await Promise.all([
      query,
      supabase.from('profiles').select('*'),
    ]);

    if (postsRes.data && profilesRes.data) {
      const profileMap = new Map(profilesRes.data.map(p => [p.user_id, p]));
      const postsWithProfiles = postsRes.data.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id),
      }));
      setPosts(postsWithProfiles as PostWithProfile[]);
    }
    
    setLoading(false);
  };

  const handleFlagPost = async (postId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('posts')
      .update({
        is_flagged: true,
        flagged_by: user.id,
        flagged_at: new Date().toISOString(),
        flag_reason: flagReason || 'Flagged for review',
      })
      .eq('id', postId);

    if (error) {
      toast({ title: 'Failed to flag post', variant: 'destructive' });
    } else {
      toast({ title: 'Post flagged for review' });
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, is_flagged: true, flag_reason: flagReason || 'Flagged for review' } 
          : p
      ));
    }
    
    setFlagReason('');
    setSelectedPost(null);
  };

  const handleUnflagPost = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .update({
        is_flagged: false,
        flagged_by: null,
        flagged_at: null,
        flag_reason: null,
      })
      .eq('id', postId);

    if (error) {
      toast({ title: 'Failed to unflag post', variant: 'destructive' });
    } else {
      toast({ title: 'Post unflagged' });
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, is_flagged: false, flag_reason: null } 
          : p
      ));
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    
    if (error) {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    } else {
      toast({ title: 'Post deleted successfully' });
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = () => {
    setShowFlagged(!showFlagged);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg flex-1">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <div className="text-sm text-muted-foreground">
            <strong>Moderation:</strong> Flag posts for review or delete inappropriate content.
          </div>
        </div>
        <Button
          variant={showFlagged ? 'default' : 'outline'}
          onClick={handleFilterChange}
          className="ml-4"
        >
          <Flag className="w-4 h-4 mr-2" />
          {showFlagged ? 'Show All' : 'Flagged Only'}
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {posts.length} of {totalCount} posts
          {showFlagged && ' (flagged only)'}
        </span>
        <span>Page {currentPage} of {totalPages || 1}</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {showFlagged ? 'No flagged posts' : 'No posts found'}
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={post.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {post.profile?.username?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">@{post.profile?.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate max-w-xs text-muted-foreground">
                      {post.content || (post.image_url ? '[Image]' : '[Empty]')}
                    </p>
                  </TableCell>
                  <TableCell>
                    {post.is_flagged ? (
                      <Badge variant="destructive" className="gap-1">
                        <Flag className="w-3 h-3" />
                        Flagged
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Check className="w-3 h-3" />
                        Normal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {post.is_flagged ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnflagPost(post.id)}
                          title="Unflag post"
                        >
                          <EyeOff className="w-4 h-4 text-green-500" />
                        </Button>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPost(post.id)}
                              title="Flag post"
                            >
                              <Flag className="w-4 h-4 text-yellow-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Flag Post</DialogTitle>
                              <DialogDescription>
                                Provide a reason for flagging this post for review.
                              </DialogDescription>
                            </DialogHeader>
                            <Textarea
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              placeholder="Reason for flagging (optional)..."
                            />
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setFlagReason('')}>
                                Cancel
                              </Button>
                              <Button onClick={() => handleFlagPost(post.id)}>
                                Flag Post
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {(isAdmin || post.is_flagged) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete post"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this post? This action cannot be undone.
                                {post.content && (
                                  <span className="block mt-2 p-2 bg-muted rounded text-foreground">
                                    "{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}"
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePost(post.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {posts.some(p => p.is_flagged && p.flag_reason) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h4 className="font-medium text-yellow-500 mb-2">Flag Reasons</h4>
          <div className="space-y-2">
            {posts.filter(p => p.is_flagged && p.flag_reason).map(post => (
              <div key={post.id} className="text-sm">
                <span className="text-muted-foreground">@{post.profile?.username}:</span>{' '}
                <span>{post.flag_reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const handleSubmit = async () => {
    if (!user || (!content.trim() && !imageUrl.trim())) return;

    setIsLoading(true);

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
    });

    if (error) {
      toast({ title: 'Failed to create post', variant: 'destructive' });
    } else {
      toast({ title: 'Post created!' });
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
      onPostCreated?.();
    }

    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {profile?.username?.slice(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-none bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0"
          />

          {showImageInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowImageInput(false);
                  setImageUrl('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border relative">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full max-h-60 object-cover"
                onError={() => setImageUrl('')}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowImageInput(!showImageInput)}
              className="text-primary hover:bg-primary/10"
            >
              <ImagePlus className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || (!content.trim() && !imageUrl.trim())}
              className="gradient-bg text-primary-foreground font-semibold hover:opacity-90"
            >
              {isLoading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

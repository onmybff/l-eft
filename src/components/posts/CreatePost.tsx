import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/ImageUpload';
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
      onPostCreated?.();
    }

    setIsLoading(false);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
  };

  if (!user) return null;

  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <Avatar className="w-12 h-12 shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {profile?.username?.slice(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-none bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0"
          />

          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border relative">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full max-h-60 object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <ImageUpload
              bucket="post-images"
              onUpload={setImageUrl}
              currentImage={imageUrl}
            />

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

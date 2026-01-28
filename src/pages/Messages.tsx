import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ConversationPreview {
  id: string;
  otherUser: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get user's conversation IDs
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setIsLoading(false);
      return;
    }

    const conversationIds = participations.map(p => p.conversation_id);
    const previews: ConversationPreview[] = [];

    for (const convoId of conversationIds) {
      // Get other participant
      const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select(`
          profiles:user_id (username, display_name, avatar_url)
        `)
        .eq('conversation_id', convoId)
        .neq('user_id', user.id)
        .maybeSingle();

      if (!otherParticipant?.profiles) continue;

      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const profiles = otherParticipant.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null };

      previews.push({
        id: convoId,
        otherUser: profiles,
        lastMessage: lastMessage || undefined,
      });
    }

    // Sort by last message time
    previews.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });

    setConversations(previews);
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        <header className="sticky top-0 z-10 glass border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : conversations.length > 0 ? (
          <div className="divide-y divide-border">
            {conversations.map((convo) => (
              <Link
                key={convo.id}
                to={`/messages/${convo.id}`}
                className="flex items-center gap-3 p-4 hover:bg-card/50 transition-colors animate-fade-in"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={convo.otherUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {convo.otherUser.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">
                      {convo.otherUser.display_name || convo.otherUser.username}
                    </p>
                    {convo.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">
                    @{convo.otherUser.username}
                  </p>
                  {convo.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {convo.lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No messages yet</p>
            <p>Start a conversation from someone's profile</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

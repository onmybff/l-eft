import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Message, Profile } from '@/types/database';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversationData();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversationData = async () => {
    if (!user || !conversationId) return;

    // Check for new conversation with user
    const newUserId = searchParams.get('new');
    if (newUserId) {
      const { data: newUserProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', newUserId)
        .maybeSingle();
      
      if (newUserProfile) {
        setOtherUser(newUserProfile as Profile);
      }
      setIsLoading(false);
      return;
    }

    // Get other participant
    const { data: otherParticipant } = await supabase
      .from('conversation_participants')
      .select(`
        profiles:user_id (*)
      `)
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .maybeSingle();

    if (otherParticipant?.profiles) {
      setOtherUser(otherParticipant.profiles as unknown as Profile);
    }

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData as Message[]);
    }

    setIsLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !conversationId || !newMessage.trim()) return;

    setIsSending(true);

    // Handle new conversation
    const newUserId = searchParams.get('new');
    if (newUserId) {
      // Add the other participant first
      await supabase.from('conversation_participants').insert({
        conversation_id: conversationId,
        user_id: newUserId,
      });
      
      // Clear the new param
      navigate(`/messages/${conversationId}`, { replace: true });
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } else {
      setNewMessage('');
    }

    setIsSending(false);
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 glass border-b border-border p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {otherUser.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{otherUser.display_name || otherUser.username}</p>
                <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender_id === user.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'gradient-bg text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border glass">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="bg-input border-border"
            />
            <Button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="gradient-bg text-primary-foreground"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

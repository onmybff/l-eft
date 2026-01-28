-- Fix overly permissive conversations INSERT policy
DROP POLICY "Users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix overly permissive conversation_participants INSERT policy
DROP POLICY "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add themselves or be added to conversations" ON public.conversation_participants FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
-- Add flagged columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS flag_reason text;

-- Update RLS policies for moderator access
CREATE POLICY "Moderators can update post flags" 
ON public.posts 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow moderators to delete flagged posts
CREATE POLICY "Moderators can delete flagged posts" 
ON public.posts 
FOR DELETE 
USING (
  is_flagged = true AND has_role(auth.uid(), 'moderator'::app_role)
);
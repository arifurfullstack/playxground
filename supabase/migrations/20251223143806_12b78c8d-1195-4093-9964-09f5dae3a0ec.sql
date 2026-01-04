-- Add policy for anyone to view waiting game rooms (so fans can see rooms to join)
CREATE POLICY "Anyone can view waiting game rooms"
ON public.game_rooms
FOR SELECT
USING (status = 'waiting');
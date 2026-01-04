-- Add named foreign key constraints for game_rooms
ALTER TABLE public.game_rooms 
DROP CONSTRAINT IF EXISTS game_rooms_creator_id_fkey,
ADD CONSTRAINT game_rooms_creator_id_fkey 
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.game_rooms 
DROP CONSTRAINT IF EXISTS game_rooms_fan_id_fkey,
ADD CONSTRAINT game_rooms_fan_id_fkey 
  FOREIGN KEY (fan_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
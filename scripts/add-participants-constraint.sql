-- Add check constraint to events table
ALTER TABLE events 
ADD CONSTRAINT check_current_participants 
CHECK (current_participants >= 0);

-- Add constraint to ensure current_participants doesn't exceed max_participants
ALTER TABLE events 
ADD CONSTRAINT check_max_participants 
CHECK (current_participants <= max_participants);

-- Function to create group chat when someone joins an event
CREATE OR REPLACE FUNCTION create_group_chat_on_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if group chat already exists for this event
    IF NOT EXISTS (
        SELECT 1 FROM group_chats WHERE event_id = NEW.event_id
    ) THEN
        -- Create group chat
        INSERT INTO group_chats (name, event_id, creator_id)
        SELECT 
            e.title || ' Chat',
            e.id,
            e.creator_id
        FROM events e
        WHERE e.id = NEW.event_id;
    END IF;

    -- Add the participant to the group chat
    INSERT INTO group_members (group_id, user_id)
    SELECT gc.id, NEW.user_id
    FROM group_chats gc
    WHERE gc.event_id = NEW.event_id
    AND NOT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = gc.id AND user_id = NEW.user_id
    );

    -- Add welcome message if this is the first member
    IF NOT EXISTS (
        SELECT 1 FROM group_messages 
        WHERE group_id = (SELECT id FROM group_chats WHERE event_id = NEW.event_id)
    ) THEN
        INSERT INTO group_messages (group_id, sender_id, message)
        SELECT 
            gc.id,
            gc.creator_id,
            'Welcome to ' || e.title || '! This is the group chat for all participants.'
        FROM group_chats gc
        JOIN events e ON e.id = gc.event_id
        WHERE gc.event_id = NEW.event_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_group_chat_trigger ON event_participants;

-- Create trigger
CREATE TRIGGER create_group_chat_trigger
AFTER INSERT ON event_participants
FOR EACH ROW
EXECUTE FUNCTION create_group_chat_on_join();

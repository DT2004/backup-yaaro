-- Function to create group chat when someone joins an event
CREATE OR REPLACE FUNCTION create_group_chat_on_join()
RETURNS TRIGGER AS $$
DECLARE
    v_group_chat_id uuid;
    v_max_participants integer;
BEGIN
    -- Get max participants for the event
    SELECT max_participants INTO v_max_participants
    FROM events
    WHERE id = NEW.event_id;

    -- Check if event is full
    IF (
        SELECT current_participants >= v_max_participants
        FROM events
        WHERE id = NEW.event_id
    ) THEN
        RAISE EXCEPTION 'Event is full';
    END IF;

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
        WHERE e.id = NEW.event_id
        RETURNING id INTO v_group_chat_id;

        -- Notify about new group chat
        PERFORM pg_notify(
            'new_group_chat',
            json_build_object(
                'event_id', NEW.event_id,
                'group_chat_id', v_group_chat_id,
                'user_id', NEW.user_id
            )::text
        );
    ELSE
        SELECT id INTO v_group_chat_id FROM group_chats WHERE event_id = NEW.event_id;
    END IF;

    -- Add the participant to the group chat
    INSERT INTO group_members (group_id, user_id)
    SELECT v_group_chat_id, NEW.user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = v_group_chat_id AND user_id = NEW.user_id
    );

    -- Add welcome message if this is the first member
    IF NOT EXISTS (
        SELECT 1 FROM group_messages WHERE group_id = v_group_chat_id
    ) THEN
        INSERT INTO group_messages (group_id, sender_id, message)
        SELECT 
            v_group_chat_id,
            gc.creator_id,
            'Welcome to ' || e.title || '! This is the group chat for all participants.'
        FROM group_chats gc
        JOIN events e ON e.id = gc.event_id
        WHERE gc.id = v_group_chat_id;
    END IF;

    -- Update event participants count with safety check
    UPDATE events
    SET current_participants = GREATEST(
        (SELECT COUNT(*) FROM event_participants WHERE event_id = NEW.event_id),
        0  -- Ensure it never goes below 0
    )
    WHERE id = NEW.event_id;

    -- Notify about member addition
    PERFORM pg_notify(
        'group_member_added',
        json_build_object(
            'event_id', NEW.event_id,
            'group_chat_id', v_group_chat_id,
            'user_id', NEW.user_id
        )::text
    );

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

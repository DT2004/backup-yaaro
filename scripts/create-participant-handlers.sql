-- Function to handle all participant-related updates
CREATE OR REPLACE FUNCTION handle_participant_change()
RETURNS TRIGGER AS $$
DECLARE
    v_group_chat_id uuid;
    v_event_title text;
    v_current_count integer;
    v_max_participants integer;
    v_event_creator_id uuid;
    v_first_member boolean;
BEGIN
    -- Get event details
    SELECT e.title, e.max_participants, e.current_participants, e.creator_id
    INTO v_event_title, v_max_participants, v_current_count, v_event_creator_id
    FROM events e
    WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);

    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        -- Check if event is full
        IF v_current_count >= v_max_participants THEN
            RAISE EXCEPTION 'Event is full';
        END IF;

        -- Check if this is the first member (excluding creator)
        SELECT NOT EXISTS (
            SELECT 1 
            FROM event_participants 
            WHERE event_id = NEW.event_id
            AND user_id != NEW.user_id
        ) INTO v_first_member;

        -- Create group chat if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM group_chats WHERE event_id = NEW.event_id
        ) THEN
            -- Create group chat with event creator as chat creator
            INSERT INTO group_chats (name, event_id, creator_id)
            VALUES (
                v_event_title || ' Chat',
                NEW.event_id,
                COALESCE(v_event_creator_id, NEW.user_id) -- Fallback to joining user if no creator
            )
            RETURNING id INTO v_group_chat_id;

            -- Add welcome message
            INSERT INTO group_messages (group_id, sender_id, message)
            VALUES (
                v_group_chat_id,
                COALESCE(v_event_creator_id, NEW.user_id),
                'Welcome to ' || v_event_title || '! This is the group chat for all participants.'
            );

            -- Add event creator to group members if they're not the one joining
            IF v_event_creator_id IS NOT NULL AND v_event_creator_id != NEW.user_id THEN
                INSERT INTO group_members (group_id, user_id)
                VALUES (v_group_chat_id, v_event_creator_id)
                ON CONFLICT (group_id, user_id) DO NOTHING;
            END IF;

            -- Notify about new group chat
            PERFORM pg_notify(
                'group_chat_created',
                json_build_object(
                    'event_id', NEW.event_id,
                    'group_chat_id', v_group_chat_id,
                    'user_id', NEW.user_id
                )::text
            );
        ELSE
            -- Get existing group chat ID
            SELECT id INTO v_group_chat_id 
            FROM group_chats 
            WHERE event_id = NEW.event_id;
        END IF;

        -- Add participant to group chat
        INSERT INTO group_members (group_id, user_id)
        VALUES (v_group_chat_id, NEW.user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;

        -- Add join message
        INSERT INTO group_messages (group_id, sender_id, message)
        SELECT 
            v_group_chat_id,
            COALESCE(v_event_creator_id, NEW.user_id),
            (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' has joined the event.'
        WHERE NOT v_first_member; -- Only add message if not first member

        -- Notify about member addition
        PERFORM pg_notify(
            'group_member_added',
            json_build_object(
                'event_id', NEW.event_id,
                'group_chat_id', v_group_chat_id,
                'user_id', NEW.user_id,
                'joined_at', NEW.joined_at
            )::text
        );
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        -- Get group chat ID for the event
        SELECT id INTO v_group_chat_id
        FROM group_chats
        WHERE event_id = OLD.event_id;

        -- Remove from group chat
        DELETE FROM group_members
        WHERE group_id = v_group_chat_id AND user_id = OLD.user_id;

        -- Add leave message
        IF v_group_chat_id IS NOT NULL THEN
            INSERT INTO group_messages (group_id, sender_id, message)
            SELECT 
                v_group_chat_id,
                COALESCE(v_event_creator_id, OLD.user_id),
                (SELECT full_name FROM profiles WHERE id = OLD.user_id) || ' has left the event.'
            WHERE EXISTS (
                SELECT 1 FROM group_chats WHERE id = v_group_chat_id
            );
        END IF;

        -- Notify about member removal
        PERFORM pg_notify(
            'group_member_removed',
            json_build_object(
                'event_id', OLD.event_id,
                'group_chat_id', v_group_chat_id,
                'user_id', OLD.user_id
            )::text
        );
    END IF;

    -- Update event participant count
    UPDATE events
    SET current_participants = GREATEST(
        (SELECT COUNT(*) FROM event_participants WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)),
        0
    )
    WHERE id = COALESCE(NEW.event_id, OLD.event_id)
    RETURNING current_participants INTO v_current_count;

    -- Notify about event update
    PERFORM pg_notify(
        'event_updated',
        json_build_object(
            'event_id', COALESCE(NEW.event_id, OLD.event_id),
            'current_participants', v_current_count
        )::text
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_event_participant_add ON event_participants;
DROP TRIGGER IF EXISTS on_participant_change ON event_participants;
DROP TRIGGER IF EXISTS create_group_chat_trigger ON event_participants;
DROP TRIGGER IF EXISTS handle_participant_changes ON event_participants;

-- Create single trigger to handle all participant changes
CREATE TRIGGER handle_participant_changes
AFTER INSERT OR DELETE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION handle_participant_change();

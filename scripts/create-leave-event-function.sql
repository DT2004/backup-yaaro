-- Function to handle leaving an event and its group chat
CREATE OR REPLACE FUNCTION leave_event(p_event_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_current_count integer;
BEGIN
    -- Get current count before removal
    SELECT current_participants INTO v_current_count
    FROM events
    WHERE id = p_event_id;

    -- Only proceed if current count is positive
    IF v_current_count > 0 THEN
        -- Remove user from event participants first
        DELETE FROM event_participants
        WHERE event_id = p_event_id AND user_id = p_user_id;

        -- Then update the current_participants count based on actual count
        UPDATE events
        SET current_participants = GREATEST(
            (SELECT COUNT(*) FROM event_participants WHERE event_id = p_event_id),
            0  -- Ensure it never goes below 0
        )
        WHERE id = p_event_id;

        -- Get the group chat ID for this event
        WITH group_chat_leave AS (
            SELECT gc.id as chat_id, gc.creator_id
            FROM group_chats gc
            WHERE gc.event_id = p_event_id
        )
        -- Remove from group chat and add leave message in one transaction
        , member_removal AS (
            DELETE FROM group_members
            WHERE group_id = (SELECT chat_id FROM group_chat_leave)
            AND user_id = p_user_id
            RETURNING group_id
        )
        INSERT INTO group_messages (group_id, sender_id, message)
        SELECT 
            chat_id,
            creator_id,
            (SELECT full_name FROM profiles WHERE id = p_user_id) || ' has left the event.'
        FROM group_chat_leave
        WHERE EXISTS (SELECT 1 FROM member_removal);

        -- Notify about event leave
        PERFORM pg_notify(
            'event_left',
            json_build_object(
                'event_id', p_event_id,
                'user_id', p_user_id,
                'current_participants', (
                    SELECT current_participants 
                    FROM events 
                    WHERE id = p_event_id
                )
            )::text
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

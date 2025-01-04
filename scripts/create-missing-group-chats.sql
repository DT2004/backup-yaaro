-- Create group chats for existing events that don't have them
WITH missing_chats AS (
  SELECT DISTINCT 
    e.id as event_id,
    e.title,
    e.description,
    ep.user_id as creator_id
  FROM events e
  JOIN event_participants ep ON ep.event_id = e.id
  LEFT JOIN group_chats gc ON gc.event_id = e.id
  WHERE gc.id IS NULL
)
INSERT INTO group_chats (name, description, creator_id, event_id)
SELECT 
  title || ' Chat',
  'Group chat for event: ' || title,
  creator_id,
  event_id
FROM missing_chats;

-- Add existing participants to their group chats
INSERT INTO group_members (group_id, user_id)
SELECT DISTINCT 
  gc.id,
  ep.user_id
FROM event_participants ep
JOIN group_chats gc ON gc.event_id = ep.event_id
LEFT JOIN group_members gm ON gm.group_id = gc.id AND gm.user_id = ep.user_id
WHERE gm.id IS NULL;

-- Consolidate the relational schema to six tables.
-- This migration intentionally refuses to discard group records or malformed
-- direct conversations. Export/resolve those records before retrying it.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE organizing_group_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM groups)
     OR EXISTS (SELECT 1 FROM group_members) THEN
    RAISE EXCEPTION 'Schema consolidation requires group events, groups, and memberships to be exported or resolved first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN conversation_members m ON m.conversation_id = c.id
    WHERE c.kind = 'direct'
    GROUP BY c.id
    HAVING COUNT(m.user_id) <> 2
  ) THEN
    RAISE EXCEPTION 'Schema consolidation requires every direct conversation to have exactly two members';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT LEAST(a.user_id, b.user_id) AS first_user,
             GREATEST(a.user_id, b.user_id) AS second_user
      FROM conversations c
      JOIN conversation_members a ON a.conversation_id = c.id
      JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id > a.user_id
      WHERE c.kind = 'direct'
    ) pairs
    GROUP BY first_user, second_user
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Schema consolidation found duplicate direct conversations for the same user pair';
  END IF;

  IF EXISTS (
    SELECT 1 FROM categories
    WHERE name <> ALL (ARRAY['Arts','Community','Dance','Food','Games','Markets','Music','Outdoors','Social','Wellness']::text[])
  ) THEN
    RAISE EXCEPTION 'Schema consolidation found categories outside the fixed application catalog';
  END IF;
END $$;

-- Fold the two category join tables into arrays. The catalog remains a shared
-- TypeScript constant, so both API write paths validate names consistently.
ALTER TABLE app_users ADD COLUMN preferred_categories TEXT[] NOT NULL DEFAULT '{}';
UPDATE app_users u
SET preferred_categories = COALESCE(
  (SELECT array_agg(c.name ORDER BY c.name)
   FROM user_category_preferences p JOIN categories c ON c.id = p.category_id
   WHERE p.user_id = u.firebase_uid),
  '{}'
);

ALTER TABLE events ADD COLUMN category_names TEXT[] NOT NULL DEFAULT '{}';
UPDATE events e
SET category_names = COALESCE(
  (SELECT array_agg(c.name ORDER BY c.name)
   FROM event_categories ec JOIN categories c ON c.id = ec.category_id
   WHERE ec.event_id = e.id),
  '{}'
);

ALTER TABLE app_users ADD CONSTRAINT app_users_preferred_categories_check CHECK (
  preferred_categories <@ ARRAY['Arts','Community','Dance','Food','Games','Markets','Music','Outdoors','Social','Wellness']::text[]
);
ALTER TABLE events ADD CONSTRAINT events_category_names_check CHECK (
  category_names <@ ARRAY['Arts','Community','Dance','Food','Games','Markets','Music','Outdoors','Social','Wellness']::text[]
);
CREATE INDEX app_users_preferred_categories_gin_idx ON app_users USING GIN (preferred_categories);
CREATE INDEX events_category_names_gin_idx ON events USING GIN (category_names);

-- Direct conversations store their two participants in canonical order.
ALTER TABLE conversations
  ADD COLUMN participant_one_user_id TEXT,
  ADD COLUMN participant_two_user_id TEXT;
WITH direct_pairs AS (
  SELECT c.id,
         MIN(m.user_id) AS participant_one_user_id,
         MAX(m.user_id) AS participant_two_user_id
  FROM conversations c
  JOIN conversation_members m ON m.conversation_id = c.id
  WHERE c.kind = 'direct'
  GROUP BY c.id
)
UPDATE conversations c
SET participant_one_user_id = p.participant_one_user_id,
    participant_two_user_id = p.participant_two_user_id
FROM direct_pairs p
WHERE c.id = p.id;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_shape_check CHECK (
    (kind = 'event' AND event_id IS NOT NULL AND participant_one_user_id IS NULL AND participant_two_user_id IS NULL)
    OR
    (kind = 'direct' AND event_id IS NULL AND participant_one_user_id IS NOT NULL
      AND participant_two_user_id IS NOT NULL AND participant_one_user_id < participant_two_user_id)
  ),
  ADD CONSTRAINT conversations_participant_one_fkey
    FOREIGN KEY (participant_one_user_id) REFERENCES app_users(firebase_uid) ON DELETE RESTRICT,
  ADD CONSTRAINT conversations_participant_two_fkey
    FOREIGN KEY (participant_two_user_id) REFERENCES app_users(firebase_uid) ON DELETE RESTRICT;
CREATE UNIQUE INDEX conversations_direct_pair_idx
  ON conversations(participant_one_user_id, participant_two_user_id) WHERE kind = 'direct';

-- Keep message history when a user leaves a conversation. Physical account
-- deletion must not erase chat history, so sender references restrict it.
-- Current access is checked against the event host/RSVP or direct-chat pair.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_sender_user_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_fkey FOREIGN KEY (conversation_id)
    REFERENCES conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT messages_sender_fkey FOREIGN KEY (sender_user_id)
    REFERENCES app_users(firebase_uid) ON DELETE RESTRICT;

-- Store pending delivery state with the inbox notification itself.
ALTER TABLE notifications ADD COLUMN published_at TIMESTAMPTZ;
UPDATE notifications n
SET published_at = delivery.published_at
FROM notification_outbox delivery
WHERE delivery.notification_id = n.id;
CREATE INDEX notifications_pending_delivery_idx
  ON notifications(id) WHERE published_at IS NULL AND event_id IS NOT NULL;

DROP TRIGGER IF EXISTS events_save_notifications ON events;
DROP FUNCTION IF EXISTS save_event_notifications();

CREATE FUNCTION save_event_notifications() RETURNS TRIGGER AS $$
DECLARE
  actor TEXT := NULLIF(current_setting('app.actor_user_id', true), '');
  changes TEXT[] := ARRAY[]::TEXT[];
  notification_kind TEXT;
  alert_message TEXT;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    notification_kind := 'event_cancelled';
    alert_message := format('%s has been cancelled.', NEW.title);
  ELSE
    IF ROW(NEW.starts_at, NEW.ends_at) IS DISTINCT FROM ROW(OLD.starts_at, OLD.ends_at) THEN
      changes := array_append(changes, 'date or time');
    END IF;
    IF ROW(NEW.location_name, NEW.city, NEW.address, NEW.latitude, NEW.longitude)
      IS DISTINCT FROM ROW(OLD.location_name, OLD.city, OLD.address, OLD.latitude, OLD.longitude) THEN
      changes := array_append(changes, 'location');
    END IF;
    IF NEW.title IS DISTINCT FROM OLD.title THEN changes := array_append(changes, 'title'); END IF;
    IF ROW(NEW.description, NEW.notes) IS DISTINCT FROM ROW(OLD.description, OLD.notes) THEN
      changes := array_append(changes, 'event details');
    END IF;
    IF ROW(NEW.price_amount, NEW.capacity, NEW.image_object_key)
      IS DISTINCT FROM ROW(OLD.price_amount, OLD.capacity, OLD.image_object_key) THEN
      changes := array_append(changes, 'attendance details');
    END IF;
    IF NEW.category_names IS DISTINCT FROM OLD.category_names THEN
      changes := array_append(changes, 'categories');
    END IF;
    IF cardinality(changes) = 0 THEN RETURN NEW; END IF;
    notification_kind := 'event_updated';
    alert_message := format('%s updated its %s.', NEW.title, array_to_string(changes, ', '));
  END IF;

  INSERT INTO notifications (recipient_user_id, actor_user_id, event_id, kind, message)
  SELECT participation.user_id, actor, NEW.id, notification_kind, alert_message
  FROM event_participations participation
  WHERE participation.event_id = NEW.id
    AND participation.status IN ('interested', 'pending_approval', 'going')
    AND participation.user_id IS DISTINCT FROM actor;

  PERFORM pg_notify('event_notifications', 'changed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_save_notifications
AFTER UPDATE ON events FOR EACH ROW EXECUTE FUNCTION save_event_notifications();

DROP INDEX IF EXISTS events_group_idx;
ALTER TABLE events DROP COLUMN organizing_group_id;
DROP TABLE notification_outbox;
DROP TABLE conversation_members;
DROP TABLE group_members;
DROP TABLE groups;
DROP TABLE event_categories;
DROP TABLE user_category_preferences;
DROP TABLE categories;

COMMIT;

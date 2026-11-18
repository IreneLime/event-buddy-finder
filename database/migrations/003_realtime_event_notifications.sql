BEGIN;

-- Optional stable public IDs keep seeded event links working with server data.
ALTER TABLE events ADD COLUMN public_id TEXT UNIQUE
    CHECK (public_id IS NULL OR public_id ~ '^[a-zA-Z][a-zA-Z0-9_-]{0,149}$');

-- Prepare notification eligibility for the proposal's approval states; the
-- current self-service participation endpoints still accept only interest/going/withdrawal.
ALTER TABLE event_participations DROP CONSTRAINT event_participations_status_check;
ALTER TABLE event_participations ADD CONSTRAINT event_participations_status_check
    CHECK (status IN ('interested', 'pending_approval', 'going', 'declined', 'withdrawn'));

-- Rows remain here until the chat service has published them. The inbox itself
-- remains in notifications, regardless of whether the recipient was online.
CREATE TABLE notification_outbox (
    notification_id BIGINT PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ
);
CREATE INDEX notification_outbox_pending_idx
    ON notification_outbox(notification_id) WHERE published_at IS NULL;

CREATE FUNCTION save_event_notifications() RETURNS TRIGGER AS $$
DECLARE
    actor TEXT := NULLIF(current_setting('app.actor_user_id', true), '');
    categories_changed BOOLEAN := COALESCE(current_setting('app.event_categories_changed', true), '') = 'true';
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
        IF ROW(NEW.price_amount, NEW.capacity, NEW.image_object_key, NEW.organizing_group_id)
            IS DISTINCT FROM ROW(OLD.price_amount, OLD.capacity, OLD.image_object_key, OLD.organizing_group_id) THEN
            changes := array_append(changes, 'attendance details');
        END IF;
        IF categories_changed THEN changes := array_append(changes, 'categories'); END IF;
        IF cardinality(changes) = 0 THEN RETURN NEW; END IF;
        notification_kind := 'event_updated';
        alert_message := format('%s updated its %s.', NEW.title, array_to_string(changes, ', '));
    END IF;

    WITH alerts AS (
        INSERT INTO notifications (recipient_user_id, actor_user_id, event_id, kind, message)
        SELECT participation.user_id, actor, NEW.id, notification_kind, alert_message
        FROM event_participations participation
        WHERE participation.event_id = NEW.id
          AND participation.status IN ('interested', 'pending_approval', 'going')
          AND participation.user_id IS DISTINCT FROM actor
        RETURNING id
    )
    INSERT INTO notification_outbox (notification_id) SELECT id FROM alerts;

    -- PostgreSQL delivers this wake-up only when the event transaction commits.
    PERFORM pg_notify('event_notifications', 'changed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_save_notifications
AFTER UPDATE ON events FOR EACH ROW EXECUTE FUNCTION save_event_notifications();

COMMIT;

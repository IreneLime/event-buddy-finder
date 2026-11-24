BEGIN;

ALTER TABLE notifications
  ADD COLUMN conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (
    (kind IN ('event_updated', 'event_cancelled') AND conversation_id IS NULL)
    OR (kind = 'chat_message' AND conversation_id IS NOT NULL AND event_id IS NULL)
  );

DROP INDEX notifications_pending_delivery_idx;
CREATE INDEX notifications_pending_delivery_idx ON notifications(id)
  WHERE published_at IS NULL AND (event_id IS NOT NULL OR conversation_id IS NOT NULL);

COMMIT;

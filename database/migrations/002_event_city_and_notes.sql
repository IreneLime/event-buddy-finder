-- Add explicit discovery city and attendee-facing logistics to event records.
ALTER TABLE events
    ADD COLUMN city TEXT NOT NULL DEFAULT 'Toronto',
    ADD COLUMN notes TEXT;

CREATE INDEX events_city_status_starts_at_idx ON events(city, status, starts_at);

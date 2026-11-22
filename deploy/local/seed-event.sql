WITH demo_event AS (
  INSERT INTO events (
    created_by_user_id, title, description, starts_at, ends_at, location_name, city
  ) VALUES (
    'demo-cathy', 'Event Buddy Demo Meetup', 'Try event chat, RSVPs, and notifications with the two demo accounts.',
    now() + interval '7 days', now() + interval '7 days 2 hours', 'Trinity Bellwoods Park', 'Toronto'
  )
  RETURNING id
)
INSERT INTO event_participations (event_id, user_id, status)
SELECT id, 'demo-mina', 'going' FROM demo_event;

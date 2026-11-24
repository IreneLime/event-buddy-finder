-- Point seeded demo events at their persistent DigitalOcean Spaces objects.
-- This migration also updates existing local Docker volumes where the demo
-- seeds have already been marked as applied and therefore will not rerun.
BEGIN;

-- Older local volumes may contain the demo meetup without a stable public ID.
UPDATE events event
SET public_id = 'event-buddy-demo-meetup'
WHERE event.created_by_user_id = 'demo-cathy'
  AND event.title = 'Event Buddy Demo Meetup'
  AND event.public_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM events existing WHERE existing.public_id = 'event-buddy-demo-meetup'
  );

UPDATE events event
SET image_object_key = 'event-images/' || seed.public_id || '/' || seed.image_file,
    updated_at = NOW()
FROM (VALUES
  ('night-market', 'toronto-night-market.jpg'),
  ('flower-market', 'toronto-flower-market.jpg'),
  ('salsa-social', 'toronto-salsa-social.jpg'),
  ('lakeside-hangout', 'mississauga-lakeside-hangout.jpg'),
  ('demo-community-meetup', 'toronto-community-coffee.jpg'),
  ('riverside-photo-walk', 'toronto-park-walk.jpg'),
  ('toronto-clay-workshop', 'toronto-pottery-workshop.jpg'),
  ('harbourfront-sketchbook', 'toronto-harbourfront-sketchbook.jpg'),
  ('kensington-tasting', 'toronto-kensington-tasting.jpg'),
  ('toronto-board-games', 'toronto-board-games.jpg'),
  ('high-park-birds', 'toronto-high-park-birds.jpg'),
  ('toronto-acoustic', 'toronto-acoustic-coffee.jpg'),
  ('scarborough-stretch', 'scarborough-morning-stretch.jpg'),
  ('toronto-zine-swap', 'toronto-zine-swap.jpg'),
  ('parkdale-social', 'toronto-parkdale-coffee.jpg'),
  ('port-credit-walk', 'mississauga-port-credit-walk.jpg'),
  ('brampton-market', 'brampton-makers-market.jpg'),
  ('markham-gallery', 'markham-gallery-afternoon.jpg'),
  ('vaughan-dance', 'vaughan-first-steps-dance.jpg'),
  ('richmond-hill-books', 'richmond-hill-book-swap.jpg'),
  ('oakville-trail', 'oakville-creek-trail.jpg'),
  ('event-buddy-demo-meetup', 'toronto-community-meetup.jpg')
) AS seed(public_id, image_file)
WHERE event.public_id = seed.public_id;

COMMIT;

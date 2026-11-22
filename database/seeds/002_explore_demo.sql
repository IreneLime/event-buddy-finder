-- Development fixtures. Run after 001_demo_data.sql and migrations 001–004.
BEGIN;

INSERT INTO app_users (firebase_uid, email, display_name, bio, profile_completed_at)
SELECT 'demo-' || id, id || '@example.test', name, bio, NOW()
FROM (VALUES
  ('jordan', 'Jordan Lee', 'I like long walks, street photography, and trying new cafés.'),
  ('maya', 'Maya Patel', 'Usually planning a pottery class or hunting for the next good book.'),
  ('theo', 'Theo Martin', 'Board game enthusiast and beginner birdwatcher.'),
  ('avery', 'Avery Singh', 'Learning to dance and always looking for live music.'),
  ('noah', 'Noah Kim', 'I photograph city parks and cook for my friends.'),
  ('leila', 'Leila Hassan', 'I enjoy local markets, community gardens, and jazz.'),
  ('sam', 'Sam Rivera', 'I run easy kilometres and have strong opinions about pastries.'),
  ('ivy', 'Ivy Zhao', 'I like making zines, sketching, and visiting galleries.'),
  ('eli', 'Eli Morgan', 'Happy to teach a new board game or share a quiet walk.'),
  ('rina', 'Rina Desai', 'I collect tea recommendations and take ceramics classes.'),
  ('owen', 'Owen Brown', 'I love park trails and listening to local musicians.'),
  ('sana', 'Sana Ahmed', 'Always up for a craft night or an afternoon at the market.'),
  ('luca', 'Luca Rossi', 'Beginner dancer and regular at community events.'),
  ('zoe', 'Zoe Chen', 'I look for small galleries and good places to read.'),
  ('milo', 'Milo Wilson', 'I like social rides, film screenings, and strategy games.'),
  ('profile-user', 'Demo User', 'Development profile for signed image URL testing.')
) AS seed(id, name, bio)
ON CONFLICT (firebase_uid) DO NOTHING;

CREATE TEMP TABLE explore_demo_events (
  public_id text, title text, owner_id text, city text, venue text,
  latitude numeric, longitude numeric, category text, price numeric, days integer,
  description text, notes text
) ON COMMIT DROP;

INSERT INTO explore_demo_events VALUES
  ('demo-community-meetup', 'Demo Community Meetup', 'demo-profile-user', 'Toronto', 'Toronto City Hall', 43.6534, -79.3841, 'Community', 0, 3, 'Share a coffee and meet people who are looking for company at local events.', 'Meet near the entrance to Nathan Phillips Square.'),
  ('riverside-photo-walk', 'Riverside Photo Walk', 'demo-cathy', 'Toronto', 'Riverdale Park East', 43.6712, -79.3554, 'Outdoors', 0, 4, 'Take an easy walk with time to photograph the skyline and swap ideas.', 'Meet near the Broadview Avenue entrance. Phones are welcome.'),
  ('toronto-clay-workshop', 'Beginner Clay & Coffee', 'demo-maya', 'Toronto', 'The Workroom', 43.6650, -79.4100, 'Arts', 18, 6, 'Try a relaxed beginner pottery session, shape a small piece by hand, and meet other people over coffee.', 'All tools and clay are provided. Wear clothes that can get a little dusty.'),
  ('harbourfront-sketchbook', 'Harbourfront Sketchbook Club', 'demo-maya', 'Toronto', 'Harbourfront Centre', 43.6386, -79.3832, 'Arts', 0, 5, 'Bring a sketchbook and spend an hour drawing by the lake with other beginners.', 'Meet in front of the main entrance. Bring pencils and a small sketchbook.'),
  ('kensington-tasting', 'Kensington Market Tasting Walk', 'demo-leila', 'Toronto', 'Kensington Market', 43.6541, -79.4004, 'Food', 0, -6, 'Explore the market at a relaxed pace and stop for snacks along the way.', 'Food is pay as you go. Meet at Baldwin and Augusta.'),
  ('toronto-board-games', 'Wednesday Board Game Table', 'demo-alex', 'Toronto', 'Bloor and Bathurst', 43.6653, -79.4111, 'Games', 8, 7, 'Try two beginner-friendly strategy games with people who can teach the rules.', 'Bring your own game if you like. The fee covers the table.'),
  ('high-park-birds', 'High Park Bird Walk', 'demo-theo', 'Toronto', 'High Park', 43.6465, -79.4637, 'Outdoors', 0, -8, 'Walk the park trails and watch for resident birds with a small group.', 'Bring binoculars if you have them. Meet at the Bloor Street gates.'),
  ('toronto-acoustic', 'Acoustic Set and Coffee', 'demo-owen', 'Toronto', 'The Junction', 43.6654, -79.4686, 'Music', 12, -9, 'Meet before a short acoustic set and stay for coffee afterward.', 'Meet outside ten minutes before the set.'),
  ('scarborough-stretch', 'Easy Morning Stretch', 'demo-sam', 'Toronto', 'Thomson Memorial Park', 43.7575, -79.2571, 'Wellness', 0, 10, 'Start the morning with a gentle stretch and a short loop around the park.', 'Bring a mat or a towel and a bottle of water.'),
  ('toronto-zine-swap', 'Zine Swap and Maker Table', 'demo-ivy', 'Toronto', 'Toronto Reference Library', 43.6718, -79.3868, 'Arts', 0, 11, 'Browse homemade zines and make a folded booklet with the group.', 'Bring a zine to share if you have one. Paper will be available.'),
  ('parkdale-social', 'Parkdale Sunday Coffee', 'demo-jordan', 'Toronto', 'Parkdale', 43.6412, -79.4376, 'Social', 0, 12, 'Join a small table for coffee and conversation about local events.', 'Coffee is pay as you go. Come for as long as you like.'),
  ('port-credit-walk', 'Port Credit Waterfront Loop', 'demo-mina', 'Mississauga', 'Port Credit Memorial Park', 43.5524, -79.5861, 'Outdoors', 0, 13, 'Follow the waterfront and stop for photos along the way.', 'Meet by the park entrance off Lakeshore Road.'),
  ('brampton-market', 'Brampton Makers Market', 'demo-rina', 'Brampton', 'Garden Square', 43.6868, -79.7599, 'Markets', 0, 14, 'Browse local craft stalls together and compare finds over tea.', 'Bring a reusable bag if you plan to shop.'),
  ('markham-gallery', 'Markham Gallery Afternoon', 'demo-nadia', 'Markham', 'Varley Art Gallery', 43.8682, -79.3132, 'Arts', 0, 15, 'Visit the gallery at an easy pace and chat about a favourite piece afterward.', 'Meet in the gallery lobby.'),
  ('vaughan-dance', 'First Steps Dance Workshop', 'demo-luca', 'Vaughan', 'Woodbridge', 43.7877, -79.5986, 'Dance', 10, -16, 'Try a short beginner dance lesson in a welcoming group.', 'Wear comfortable shoes. No partner is needed.'),
  ('richmond-hill-books', 'Richmond Hill Book Swap', 'demo-zoe', 'Richmond Hill', 'Richmond Hill Central Library', 43.8665, -79.4384, 'Community', 0, 17, 'Bring a book to trade and pick up a recommendation from another reader.', 'Meet by the entrance. A book is optional.'),
  ('oakville-trail', 'Oakville Creek Trail Walk', 'demo-milo', 'Oakville', 'Lions Valley Park', 43.4677, -79.7439, 'Outdoors', 0, 18, 'Walk a section of the creek trail at a relaxed pace with breaks for photos.', 'Wear shoes with good grip and bring water.');

-- The image API publisher attaches event-photo object keys after these rows exist.
UPDATE events SET public_id = 'demo-community-meetup'
WHERE created_by_user_id = 'demo-profile-user' AND title = 'Demo Community Meetup'
  AND public_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM events WHERE public_id = 'demo-community-meetup');

INSERT INTO events (
  public_id, created_by_user_id, title, description, notes, city, location_name,
  latitude, longitude, starts_at, ends_at, price_amount
)
SELECT public_id, owner_id, title, description, notes, city, venue, latitude, longitude,
  date_trunc('day', NOW(), 'America/Toronto') + make_interval(days => days, hours => 18),
  date_trunc('day', NOW(), 'America/Toronto') + make_interval(days => days, hours => 20),
  price
FROM explore_demo_events
ON CONFLICT (public_id) DO NOTHING;

-- Move these fixtures into the past in databases that seeded them as upcoming.
UPDATE events event
SET starts_at = date_trunc('day', NOW(), 'America/Toronto') + make_interval(days => seed.days, hours => 18),
    ends_at = date_trunc('day', NOW(), 'America/Toronto') + make_interval(days => seed.days, hours => 20)
FROM explore_demo_events seed
WHERE event.public_id = seed.public_id
  AND event.created_by_user_id = seed.owner_id
  AND event.title = seed.title
  AND seed.days < 0
  AND COALESCE(event.ends_at, event.starts_at) >= NOW();

UPDATE events event
SET category_names = ARRAY[seed.category]::text[]
FROM explore_demo_events seed
WHERE event.public_id = seed.public_id
  AND event.created_by_user_id = seed.owner_id;

-- Seed attendance history and upcoming interests without replacing existing RSVPs.
INSERT INTO event_participations (event_id, user_id, status)
SELECT event.id, seed.user_id, seed.status
FROM (VALUES
  ('demo-cathy', 'kensington-tasting', 'going'),
  ('demo-cathy', 'toronto-acoustic', 'going'),
  ('demo-cathy', 'harbourfront-sketchbook', 'interested'),
  ('demo-cathy', 'toronto-board-games', 'interested'),
  ('demo-mina', 'kensington-tasting', 'going'),
  ('demo-mina', 'high-park-birds', 'going'),
  ('demo-mina', 'harbourfront-sketchbook', 'interested'),
  ('demo-mina', 'markham-gallery', 'interested'),
  ('demo-alex', 'high-park-birds', 'going'),
  ('demo-alex', 'toronto-acoustic', 'going'),
  ('demo-alex', 'port-credit-walk', 'interested'),
  ('demo-alex', 'oakville-trail', 'interested'),
  ('demo-nadia', 'kensington-tasting', 'going'),
  ('demo-nadia', 'vaughan-dance', 'going'),
  ('demo-nadia', 'brampton-market', 'interested'),
  ('demo-nadia', 'toronto-zine-swap', 'interested')
) AS seed(user_id, public_id, status)
JOIN explore_demo_events fixture USING (public_id)
JOIN events event ON event.public_id = fixture.public_id AND event.created_by_user_id = fixture.owner_id
ON CONFLICT (event_id, user_id) DO NOTHING;

-- A sample conversation for the new Riverside event.
INSERT INTO event_participations (event_id, user_id, status)
SELECT id, 'demo-maya', 'interested' FROM events WHERE public_id = 'riverside-photo-walk'
ON CONFLICT DO NOTHING;

INSERT INTO conversations (kind, event_id)
SELECT 'event', id FROM events WHERE public_id = 'riverside-photo-walk'
ON CONFLICT (event_id) WHERE kind = 'event' DO NOTHING;

INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
SELECT c.id, seed.sender_id, seed.body, LEAST(e.starts_at, NOW()) - seed.lead
FROM conversations c JOIN events e ON c.event_id = e.id
CROSS JOIN (VALUES
  ('demo-cathy', 'Meet by the Broadview Avenue entrance. I’ll bring a small camera.', INTERVAL '2 days'),
  ('demo-maya', 'I’ll bring my phone. Looking forward to the skyline views!', INTERVAL '1 day')
) AS seed(sender_id, body, lead)
WHERE e.public_id = 'riverside-photo-walk'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id
      AND m.sender_user_id = seed.sender_id AND m.body = seed.body
  );

COMMIT;

-- Fictional local development fixtures only. These Firebase UIDs are placeholders;
-- they are not accounts in Firebase and must never be used as production identities.
BEGIN;

INSERT INTO app_users (firebase_uid, email, display_name, age_range, affiliation, bio, profile_completed_at)
VALUES
  ('demo-cathy', 'cathy@example.test', 'Cathy Chen', '18_24', 'University of Toronto · ECE', 'I study electrical and computer engineering in Toronto. On weekends I look for pottery workshops, small concerts, and cafés worth going back to. I usually bring a camera on walks and am happy to meet up early if you’re coming solo.', NOW()),
  ('demo-mina', 'mina@example.test', 'Mina Park', '25_34', 'University of Toronto · Architecture', 'I’m an architecture student who likes sketching storefronts and looking up the stories behind old buildings. My ideal Saturday is a neighbourhood market followed by dumplings. I host easy walks with time for coffee and a few detours.', NOW()),
  ('demo-alex', 'alex@example.test', 'Alex Rivera', '25_34', 'Toronto Arts Community', 'I organize small board game nights in Toronto and enjoy teaching games to people who haven’t played before. I’m also working through a list of local live-music venues. On a quiet weekend, you’ll find me walking in High Park with a coffee.', NOW()),
  ('demo-nadia', 'nadia@example.test', 'Nadia Chen', '18_24', 'Markham Community Arts Council', 'I volunteer with community arts events in Markham and take photos of local markets. I like gallery afternoons and dance classes where everyone is learning together. I’m always up for trading tips on nearby makers and workshops.', NOW())
ON CONFLICT (firebase_uid) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  age_range = EXCLUDED.age_range,
  affiliation = EXCLUDED.affiliation,
  bio = EXCLUDED.bio,
  profile_completed_at = EXCLUDED.profile_completed_at,
  updated_at = NOW();

INSERT INTO categories (name) VALUES
  ('Arts'), ('Community'), ('Dance'), ('Food'), ('Games'), ('Markets'), ('Music'), ('Outdoors'), ('Social'), ('Wellness')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_category_preferences (user_id, category_id)
SELECT seed.user_id, category.id
FROM (VALUES
  ('demo-cathy', 'Arts'), ('demo-cathy', 'Food'), ('demo-cathy', 'Music'),
  ('demo-mina', 'Food'), ('demo-mina', 'Community'), ('demo-mina', 'Arts'),
  ('demo-alex', 'Games'), ('demo-alex', 'Outdoors'), ('demo-alex', 'Music'),
  ('demo-nadia', 'Arts'), ('demo-nadia', 'Markets'), ('demo-nadia', 'Dance')
) AS seed(user_id, category_name)
JOIN categories category ON category.name = seed.category_name
ON CONFLICT (user_id, category_id) DO NOTHING;

-- Fixed sample event dates make the seed reproducible for the Fall 2026 demo.
INSERT INTO events (
  created_by_user_id, title, description, notes, starts_at, ends_at,
  location_name, city, address, latitude, longitude, price_amount, status
)
SELECT seed.created_by_user_id, seed.title, seed.description, seed.notes,
       seed.starts_at, seed.ends_at, seed.location_name, seed.city, seed.address,
       seed.latitude, seed.longitude, seed.price_amount, 'scheduled'
FROM (VALUES
  ('demo-mina', 'Lanterns & Late Bites', 'Spend a relaxed Sunday evening exploring the food stalls and local makers at Stackt Market. We will try a few snacks, share recommendations, and leave room for dessert. Come solo or bring a friend; the group will meet at the main entrance before wandering together.', 'Meet beside the Bathurst Street entrance at 6:20 PM. The market is mostly outdoors, so bring a warm layer. Food is pay-as-you-go, with vegetarian options. Message the chat if you are running late.', '2026-11-15 18:30:00-05'::timestamptz, '2026-11-15 21:30:00-05'::timestamptz, 'Stackt Market', 'Toronto', '28 Bathurst St, Toronto, ON', 43.639400, -79.402200, 0.00::numeric),
  ('demo-nadia', 'Saturday Flower Market & Coffee', 'Browse seasonal flowers, houseplants, and handmade goods along historic Main Street Unionville. We will visit a few stalls together, compare finds, and take a coffee break in the village. It is a relaxed outing for anyone who enjoys local makers or wants to explore Markham.', 'Meet at the south entrance to Main Street at 10:00 AM. Bring a reusable tote and dress for an outdoor market. Purchases are optional; the coffee stop is pay-your-own-way. We will move to a nearby café if it rains.', '2026-11-21 10:00:00-05'::timestamptz, '2026-11-21 12:00:00-05'::timestamptz, 'Main Street Unionville', 'Markham', 'Main Street Unionville, Markham, ON', 43.865500, -79.312700, 0.00::numeric),
  ('demo-alex', 'Beginner Salsa Social', 'Try a few salsa basics in a friendly beginner lesson, then stay for an open social with music and time to practice. The instructor will break down the steps slowly, rotate partners during the lesson, and keep the atmosphere welcoming for first-timers.', 'Arrive by 6:45 PM for the 7:00 PM lesson. No partner is required. Wear comfortable shoes that stay securely on your feet; the ticket covers the lesson and social dancing.', '2026-11-20 19:00:00-05'::timestamptz, '2026-11-20 21:30:00-05'::timestamptz, 'Dovercourt House', 'Toronto', '805 Dovercourt Rd, Toronto, ON', 43.662000, -79.431500, 12.00::numeric),
  ('demo-mina', 'Lakeside Walk & Hot Chocolate', 'Take a relaxed waterfront stroll near Celebration Square and the civic district, with plenty of time to talk and take photos. After the walk, we will find a nearby café for hot chocolate. Join for the walk, the café, or both.', 'Meet by the main entrance to Celebration Square at 2:00 PM. Dress for the weather and wear shoes suitable for a paved walk. The walk is free; drinks are optional and purchased individually.', '2026-11-29 14:00:00-05'::timestamptz, '2026-11-29 16:00:00-05'::timestamptz, 'Celebration Square', 'Mississauga', '300 City Centre Dr, Mississauga, ON', 43.589000, -79.644100, 0.00::numeric)
) AS seed(created_by_user_id, title, description, notes, starts_at, ends_at, location_name, city, address, latitude, longitude, price_amount)
WHERE NOT EXISTS (
  SELECT 1 FROM events existing
  WHERE existing.created_by_user_id = seed.created_by_user_id
    AND existing.title = seed.title
    AND existing.starts_at = seed.starts_at
);

-- Preserve the public URLs used by the frontend and chat demo fixtures.
UPDATE events event SET public_id = seed.public_id
FROM (VALUES
  ('night-market', 'Lanterns & Late Bites', 'demo-mina'),
  ('flower-market', 'Saturday Flower Market & Coffee', 'demo-nadia'),
  ('salsa-social', 'Beginner Salsa Social', 'demo-alex'),
  ('lakeside-hangout', 'Lakeside Walk & Hot Chocolate', 'demo-mina')
) AS seed(public_id, title, owner)
WHERE event.title = seed.title AND event.created_by_user_id = seed.owner AND event.public_id IS NULL;

INSERT INTO event_categories (event_id, category_id)
SELECT event.id, category.id
FROM (VALUES
  ('Lanterns & Late Bites', 'Food'), ('Lanterns & Late Bites', 'Community'),
  ('Saturday Flower Market & Coffee', 'Markets'), ('Saturday Flower Market & Coffee', 'Community'),
  ('Beginner Salsa Social', 'Dance'), ('Beginner Salsa Social', 'Wellness'),
  ('Lakeside Walk & Hot Chocolate', 'Outdoors'), ('Lakeside Walk & Hot Chocolate', 'Social')
) AS seed(event_title, category_name)
JOIN events event ON event.title = seed.event_title
JOIN categories category ON category.name = seed.category_name
ON CONFLICT (event_id, category_id) DO NOTHING;

INSERT INTO event_participations (event_id, user_id, status)
SELECT event.id, seed.user_id, seed.status
FROM (VALUES
  ('Lanterns & Late Bites', 'demo-cathy', 'interested'), ('Lanterns & Late Bites', 'demo-alex', 'going'), ('Lanterns & Late Bites', 'demo-mina', 'going'),
  ('Saturday Flower Market & Coffee', 'demo-cathy', 'interested'), ('Saturday Flower Market & Coffee', 'demo-mina', 'going'), ('Saturday Flower Market & Coffee', 'demo-nadia', 'going'),
  ('Beginner Salsa Social', 'demo-cathy', 'going'), ('Beginner Salsa Social', 'demo-nadia', 'interested'), ('Beginner Salsa Social', 'demo-alex', 'going'),
  ('Lakeside Walk & Hot Chocolate', 'demo-alex', 'interested'), ('Lakeside Walk & Hot Chocolate', 'demo-nadia', 'going'), ('Lakeside Walk & Hot Chocolate', 'demo-mina', 'going')
) AS seed(event_title, user_id, status)
JOIN events event ON event.title = seed.event_title
ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

INSERT INTO conversations (kind, event_id)
SELECT 'event', event.id
FROM events event
WHERE event.title IN ('Lanterns & Late Bites', 'Saturday Flower Market & Coffee', 'Beginner Salsa Social', 'Lakeside Walk & Hot Chocolate')
ON CONFLICT (event_id) WHERE kind = 'event' DO NOTHING;

INSERT INTO conversation_members (conversation_id, user_id)
SELECT conversation.id, member.firebase_uid
FROM conversations conversation
JOIN events event ON event.id = conversation.event_id
JOIN app_users member ON member.firebase_uid = event.created_by_user_id
WHERE conversation.kind = 'event'
  AND event.title IN ('Lanterns & Late Bites', 'Saturday Flower Market & Coffee', 'Beginner Salsa Social', 'Lakeside Walk & Hot Chocolate')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, user_id)
SELECT conversation.id, participation.user_id
FROM conversations conversation
JOIN event_participations participation ON participation.event_id = conversation.event_id
JOIN events event ON event.id = conversation.event_id
WHERE conversation.kind = 'event'
  AND event.title IN ('Lanterns & Late Bites', 'Saturday Flower Market & Coffee', 'Beginner Salsa Social', 'Lakeside Walk & Hot Chocolate')
  AND participation.status IN ('interested', 'going')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- A small direct conversation for testing profile-to-chat navigation.
WITH matching_conversation AS (
  SELECT conversation.id
  FROM conversations conversation
  WHERE conversation.kind = 'direct'
    AND (SELECT COUNT(*) FROM conversation_members member WHERE member.conversation_id = conversation.id) = 2
    AND EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = 'demo-cathy')
    AND EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = 'demo-mina')
), inserted_conversation AS (
  INSERT INTO conversations (kind)
  SELECT 'direct'
  WHERE NOT EXISTS (SELECT 1 FROM matching_conversation)
  RETURNING id
), target_conversation AS (
  SELECT id FROM matching_conversation
  UNION ALL
  SELECT id FROM inserted_conversation
)
INSERT INTO conversation_members (conversation_id, user_id)
SELECT target.id, member.firebase_uid
FROM target_conversation target
CROSS JOIN app_users member
WHERE member.firebase_uid IN ('demo-cathy', 'demo-mina')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
SELECT conversation.id, seed.sender_id, seed.body, seed.created_at
FROM (VALUES
  ('Lanterns & Late Bites', 'demo-mina', 'I’ll be by the main entrance at 6:20. Message here if you get turned around.', '2026-11-12 18:42:00-05'::timestamptz),
  ('Lanterns & Late Bites', 'demo-alex', 'I have been meaning to try the dumplings. See you all Sunday!', '2026-11-12 18:47:00-05'::timestamptz),
  ('Saturday Flower Market & Coffee', 'demo-nadia', 'The flower stalls open at 10. Bring a tote if you have one.', '2026-11-13 09:10:00-05'::timestamptz),
  ('Saturday Flower Market & Coffee', 'demo-cathy', 'Great, I will meet you by the south entrance.', '2026-11-13 09:18:00-05'::timestamptz),
  ('Beginner Salsa Social', 'demo-alex', 'First-timers are very welcome. The instructor will teach the basics.', '2026-11-13 15:20:00-05'::timestamptz),
  ('Lakeside Walk & Hot Chocolate', 'demo-mina', 'We will check the weather and post the route the evening before.', '2026-11-13 17:30:00-05'::timestamptz)
) AS seed(event_title, sender_id, body, created_at)
JOIN events event ON event.title = seed.event_title
JOIN conversations conversation ON conversation.event_id = event.id AND conversation.kind = 'event'
WHERE EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = seed.sender_id)
  AND NOT EXISTS (SELECT 1 FROM messages existing WHERE existing.conversation_id = conversation.id AND existing.sender_user_id = seed.sender_id AND existing.body = seed.body);

INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
SELECT conversation.id, seed.sender_id, seed.body, seed.created_at
FROM (VALUES
  ('demo-cathy', 'Want to check out the flower market before the afternoon concert?', '2026-11-10 16:05:00-05'::timestamptz),
  ('demo-mina', 'That sounds perfect. I know a coffee place nearby too.', '2026-11-10 16:11:00-05'::timestamptz)
) AS seed(sender_id, body, created_at)
JOIN conversations conversation ON conversation.kind = 'direct'
  AND (SELECT COUNT(*) FROM conversation_members participant WHERE participant.conversation_id = conversation.id) = 2
WHERE EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = seed.sender_id)
  AND EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = 'demo-cathy')
  AND EXISTS (SELECT 1 FROM conversation_members member WHERE member.conversation_id = conversation.id AND member.user_id = 'demo-mina')
  AND NOT EXISTS (SELECT 1 FROM messages existing WHERE existing.conversation_id = conversation.id AND existing.sender_user_id = seed.sender_id AND existing.body = seed.body);

COMMIT;

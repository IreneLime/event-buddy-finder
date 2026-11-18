-- Development-only demo records for signed image URL integration.
-- Safe to run repeatedly. Do not apply this seed to production.

INSERT INTO app_users (
    firebase_uid,
    email,
    display_name,
    bio,
    profile_image_key,
    profile_completed_at
)
VALUES (
    'demo-profile-user',
    'demo-profile@example.invalid',
    'Demo User',
    'Development profile for signed image URL testing.',
    'demo/profile/default-gray-v1.png',
    NOW()
)
ON CONFLICT (firebase_uid) DO UPDATE
SET profile_image_key = EXCLUDED.profile_image_key,
    updated_at = NOW();

INSERT INTO events (
    created_by_user_id,
    title,
    description,
    starts_at,
    ends_at,
    location_name,
    image_object_key
)
SELECT
    'demo-profile-user',
    'Demo Community Meetup',
    'Development event for signed image URL testing.',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days 2 hours',
    'Toronto',
    'demo/events/default-cover-v1.png'
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE created_by_user_id = 'demo-profile-user'
      AND title = 'Demo Community Meetup'
);

UPDATE events
SET image_object_key = 'demo/events/default-cover-v1.png',
    updated_at = NOW()
WHERE created_by_user_id = 'demo-profile-user'
  AND title = 'Demo Community Meetup';

-- Initial PostgreSQL schema for Event Buddy Finder.
-- Firebase Authentication owns credentials; app_users stores application profile data.

CREATE TABLE app_users (
    firebase_uid TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    age_range TEXT CHECK (
        age_range IS NULL OR age_range IN ('under_18', '18_24', '25_34', '35_44', '45_plus')
    ),
    affiliation TEXT,
    bio TEXT,
    profile_image_key TEXT,
    profile_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE user_category_preferences (
    user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, category_id)
);

CREATE TABLE groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX group_members_user_idx ON group_members(user_id, group_id);

CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_by_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE RESTRICT,
    organizing_group_id BIGINT REFERENCES groups(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    location_name TEXT NOT NULL,
    address TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    price_amount NUMERIC(10, 2) CHECK (price_amount IS NULL OR price_amount >= 0),
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    image_object_key TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at IS NULL OR ends_at > starts_at),
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
);

CREATE INDEX events_starts_at_idx ON events(starts_at) WHERE status = 'scheduled';
CREATE INDEX events_status_location_idx ON events(status, location_name, starts_at);
CREATE INDEX events_group_idx ON events(organizing_group_id, starts_at);
CREATE INDEX events_creator_idx ON events(created_by_user_id, created_at DESC);

CREATE TABLE event_categories (
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, category_id)
);

CREATE INDEX event_categories_category_idx ON event_categories(category_id, event_id);

CREATE TABLE event_participations (
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('interested', 'going', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX event_participations_user_idx ON event_participations(user_id, status, event_id);
CREATE INDEX event_participations_event_status_idx ON event_participations(event_id, status);

-- A conversation is either the single group chat for an event or a direct conversation.
CREATE TABLE conversations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('event', 'direct')),
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((kind = 'event' AND event_id IS NOT NULL) OR (kind = 'direct' AND event_id IS NULL))
);

CREATE UNIQUE INDEX conversations_one_event_chat_idx
    ON conversations(event_id) WHERE kind = 'event';

CREATE TABLE conversation_members (
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX conversation_members_user_idx ON conversation_members(user_id, conversation_id);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_user_id TEXT NOT NULL,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (conversation_id, sender_user_id)
        REFERENCES conversation_members(conversation_id, user_id) ON DELETE CASCADE
);

CREATE INDEX messages_conversation_time_idx ON messages(conversation_id, created_at DESC, id DESC);

CREATE TABLE notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('event_updated', 'event_cancelled')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX notifications_inbox_idx
    ON notifications(recipient_user_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread_idx
    ON notifications(recipient_user_id, created_at DESC) WHERE read_at IS NULL;


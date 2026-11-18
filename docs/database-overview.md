# Database overview

Event Buddy Finder uses **one shared PostgreSQL database per environment**, with **13 permanent application tables** after migrations 001–003. The events, profile, chat, and image services point to the same database through `DATABASE_URL`. A local preview or automated test can use a separate database with the same schema to keep its data isolated. The number of running copies depends on which environments are active.

Firebase Authentication stores login accounts and credentials. PostgreSQL stores app profiles linked to the Firebase UID. DigitalOcean Spaces stores image files, and PostgreSQL stores their object keys.

| Area | Tables | Count |
| --- | --- | ---: |
| Profiles and interests | `app_users`, `categories`, `user_category_preferences` | 3 |
| Groups | `groups`, `group_members` | 2 |
| Events and RSVPs | `events`, `event_categories`, `event_participations` | 3 |
| Chat | `conversations`, `conversation_members`, `messages` | 3 |
| Notifications | `notifications`, `notification_outbox` | 2 |
| **Total** | | **13** |

The schema includes chat tables for conversations and messages. The current chat service keeps newly sent messages and direct conversations in memory, while event RSVPs and notifications use PostgreSQL.

The [migration scripts](../database/migrations/) change the schema in order. This lets an existing database apply just the migrations it has missed and keep its records. The optional [seed scripts](../database/seeds/) add fictional data for development and demos. They can be run after the migrations when a demo dataset is useful. See the [database setup instructions](../database/README.md).

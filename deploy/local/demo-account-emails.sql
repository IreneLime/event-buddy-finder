-- Match the Docker emulator logins while retaining both seeded profile IDs.
UPDATE app_users profile
SET email = account.email
FROM (VALUES
  ('demo-cathy', 'cathy@example.test', 'cathy.chen@example.com'),
  ('demo-mina', 'mina@example.test', 'mina.park@example.com')
) AS account(uid, old_email, email)
WHERE profile.firebase_uid = account.uid AND profile.email = account.old_email;

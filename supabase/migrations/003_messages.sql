CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type     text NOT NULL DEFAULT 'track',
  -- track fields (nullable for playlist messages)
  track_id         text,
  track_title      text,
  track_channel    text,
  track_thumbnail  text,
  track_duration   int NOT NULL DEFAULT 0,
  -- playlist fields
  playlist_name    text,
  playlist_tracks  jsonb,
  -- reaction (set by receiver)
  reaction         text,
  read             boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx   ON messages(sender_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "send own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

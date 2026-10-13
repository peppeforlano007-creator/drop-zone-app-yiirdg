-- Create chat_read_receipts table for persistent cross-device read state
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own receipts"
  ON chat_read_receipts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own receipts"
  ON chat_read_receipts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own receipts"
  ON chat_read_receipts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

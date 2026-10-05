-- ============================================================================
-- PDL UP — Supabase Database Schema & Row Level Security (RLS)
-- Jalankan skrip SQL ini di Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Buat Tabel Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  courts JSONB NOT NULL DEFAULT '[]'::jsonb,
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_round_index INTEGER NOT NULL DEFAULT 0,
  leaderboard JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'live',
  created_at BIGINT NOT NULL,
  last_updated BIGINT NOT NULL
);

-- 2. Index untuk performa query cepat berdasarkan user
CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON public.tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_last_updated ON public.tournaments(last_updated DESC);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan Keamanan (RLS Policies): Setiap user hanya bisa mengelola turnamen miliknya sendiri

-- Policy SELECT: User dapat membaca turnamen miliknya
DROP POLICY IF EXISTS "Users can view their own tournaments" ON public.tournaments;
CREATE POLICY "Users can view their own tournaments"
  ON public.tournaments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy INSERT: User dapat menambahkan turnamen dengan user_id miliknya
DROP POLICY IF EXISTS "Users can insert their own tournaments" ON public.tournaments;
CREATE POLICY "Users can insert their own tournaments"
  ON public.tournaments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: User dapat memperbarui turnamen miliknya
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;
CREATE POLICY "Users can update their own tournaments"
  ON public.tournaments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy DELETE: User dapat menghapus turnamen miliknya
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.tournaments;
CREATE POLICY "Users can delete their own tournaments"
  ON public.tournaments
  FOR DELETE
  USING (auth.uid() = user_id);

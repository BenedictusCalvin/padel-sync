import { createClient } from '@supabase/supabase-js';
import type { TournamentRecord } from '../types/tournament';
import { getTournamentVisibility } from '../types/tournament';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ============================================================================
// AUTH HELPERS
// ============================================================================

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase client is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  if (!supabase) {
    throw new Error('Supabase client is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase client is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================================================================
// TOURNAMENT DATABASE SYNC HELPERS
// ============================================================================

export interface DbTournamentRow {
  id: string;
  user_id: string;
  name: string;
  config: any;
  players: any;
  courts: any;
  rounds: any;
  current_round_index: number;
  leaderboard: any;
  status: string;
  created_at: number;
  last_updated: number;
}

export function toRecord(row: DbTournamentRow): TournamentRecord {
  const vis = (row.config?.visibility === 'private' || (row as any).visibility === 'private') ? 'private' : 'public';
  const joinReqs = (row as any).join_requests || row.config?.joinRequests || [];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    config: {
      ...row.config,
      visibility: vis,
      joinRequests: joinReqs
    },
    visibility: vis,
    joinRequests: joinReqs,
    players: row.players,
    courts: row.courts,
    rounds: row.rounds,
    currentRoundIndex: row.current_round_index,
    leaderboard: row.leaderboard,
    status: row.status as any,
    createdAt: row.created_at,
    lastUpdated: row.last_updated
  };
}

export function toDbRow(record: TournamentRecord, userId: string): DbTournamentRow {
  const vis = getTournamentVisibility(record);
  return {
    id: record.id,
    user_id: userId,
    name: record.name,
    config: {
      ...record.config,
      visibility: vis,
      joinRequests: record.joinRequests || []
    },
    players: record.players,
    courts: record.courts,
    rounds: record.rounds,
    current_round_index: record.currentRoundIndex,
    leaderboard: record.leaderboard,
    status: record.status,
    created_at: record.createdAt,
    last_updated: record.lastUpdated
  };
}

export async function fetchUserTournaments(userId: string): Promise<TournamentRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('user_id', userId)
    .order('last_updated', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments from Supabase:', error);
    throw error;
  }

  return (data || []).map(toRecord);
}

export async function upsertTournamentDb(record: TournamentRecord, userId: string) {
  if (!supabase) return;
  const row = toDbRow(record, userId);
  const { error } = await supabase.from('tournaments').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Error saving tournament to Supabase:', error);
    throw error;
  }
}

export async function deleteTournamentDb(tournamentId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
  if (error) {
    console.error('Error deleting tournament from Supabase:', error);
    throw error;
  }
}

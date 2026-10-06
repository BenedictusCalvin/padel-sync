/**
 * Reclub API & Link Fetcher Utility
 * Interacts with Reclub endpoints to fetch live attendee lists and event details.
 */

import { parseReclubText } from './reclubParser';

export const RECLUB_API_BASE = 'https://api.reclub.co';

export const MeetParticipantStatus = {
  Hold: -2,
  Declined: -1,
  Spectator: 0,
  Approved: 1, // Confirmed / Going
  Waitlist: 2,
  Invited: 3,
  Requested: 4,
  Maybe: 5,
} as const;

export const MeetParticipantType = {
  User: 1,
  Reserved: 2,
  PlusOne: 3,
} as const;

export interface ReclubParticipant {
  id: string | number;
  referenceId?: string | number;
  referenceType?: number;
  status: number;
  name?: string;
  teamId?: string | number;
  isHost?: boolean;
  updatedAt?: number;
}

export interface ReclubPlayerProfile {
  userId: number | string;
  name?: string;
  username?: string;
  imageUrl?: string;
  gender?: string;
}

export interface ReclubEventDetails {
  ref: string;
  title: string;
  description?: string;
  venueName?: string;
  venueAddress?: string;
  sportName?: string;
  numPlayers?: number;
  confirmedCount: number;
  waitlistCount: number;
  totalParticipants: number;
  startTime?: string;
}

export interface ReclubFetchResult {
  success: boolean;
  players: string[];
  eventDetails?: ReclubEventDetails;
  error?: string;
}

/**
 * Extracts the Reclub event reference code from a URL or raw string.
 * Supports:
 * - https://reclub.co/m/XXXXXX
 * - https://reclub.co/en/m/XXXXXX
 * - https://reclub.co/id/m/XXXXXX
 * - https://app.reclub.co/m/XXXXXX
 * - reclub.co/m/XXXXXX
 * - /meets/by-ref/XXXXXX
 * - raw alphanumeric code (4-32 chars)
 */
export function extractReclubRef(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Pattern for /m/:ref with optional locale prefix (/en/m/, /id/m/, etc.)
  const mMatch = trimmed.match(/(?:reclub\.co|^)(?:\/[a-z]{2}(?:-[a-z]+)?)?\/m\/([a-zA-Z0-9_-]+)/i);
  if (mMatch && mMatch[1]) {
    return mMatch[1];
  }

  // Pattern for /meets/by-ref/:ref
  const meetMatch = trimmed.match(/\/meets\/by-ref\/([a-zA-Z0-9_-]+)/i);
  if (meetMatch && meetMatch[1]) {
    return meetMatch[1];
  }

  // If user pasted raw ref code directly without slashes or dots
  if (/^[a-zA-Z0-9_-]{4,32}$/.test(trimmed) && !trimmed.includes('.') && !trimmed.includes('/')) {
    return trimmed;
  }

  return null;
}

/**
 * Checks whether the input string looks like a Reclub link.
 */
export function isReclubUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return /reclub\.co/i.test(input) || /^\s*https?:\/\/[^\s]*\/m\//i.test(input);
}

/**
 * Fetch helper with fallback to CORS proxy if browser blocks direct request
 */
async function fetchWithCorsFallback(url: string, headers: Record<string, string> = {}): Promise<Response> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    return res;
  } catch (_err) {
    // If direct fetch fails (network/CORS error in browser), try public CORS proxies
    const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    try {
      const proxyRes = await fetch(proxyUrl1, { method: 'GET' });
      if (proxyRes.ok) return proxyRes;
    } catch {
      // ignore and try next
    }

    const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    return await fetch(proxyUrl2, { method: 'GET' });
  }
}

/**
 * Fetches player names and event info from a Reclub event link or code.
 */
export async function fetchReclubEventPlayers(
  refOrUrl: string,
  options: {
    includeWaitlist?: boolean;
    lang?: 'id' | 'en';
  } = {}
): Promise<ReclubFetchResult> {
  const lang = options.lang || 'id';
  const trimmed = refOrUrl.trim();

  // If user pasted a clubs/community link
  if (/reclub\.co\/clubs\//i.test(trimmed)) {
    return {
      success: false,
      players: [],
      error:
        lang === 'id'
          ? 'Tautan ini adalah halaman Komunitas/Klub. Harap gunakan tautan Acara (Event) spesifik dengan format: https://reclub.co/m/kode-event'
          : 'This link is a Club/Community page. Please use a specific Event link formatted as: https://reclub.co/m/event-code',
    };
  }

  const ref = extractReclubRef(trimmed);
  if (!ref) {
    return {
      success: false,
      players: [],
      error:
        lang === 'id'
          ? 'Format link Reclub tidak dikenali. Contoh yang benar: https://reclub.co/m/AbCdEf'
          : 'Unrecognized Reclub link format. Valid format example: https://reclub.co/m/AbCdEf',
    };
  }

  try {
    const meetUrl = `${RECLUB_API_BASE}/meets/by-ref/${ref}`;
    const meetRes = await fetchWithCorsFallback(meetUrl, {
      'x-output-casing': 'camelCase',
    });

    if (meetRes.status === 404) {
      return {
        success: false,
        players: [],
        error:
          lang === 'id'
            ? 'Event Reclub tidak ditemukan atau bersifat privat (hanya anggota klub yang bisa melihat). Anda bisa menyalin daftar peserta langsung dari aplikasi Reclub dan tempel di tab "Salin Teks".'
            : 'Reclub event not found or is private (restricted to club members). You can copy the attendee list from the Reclub app and paste it in the "Paste Names" tab.',
      };
    }

    if (!meetRes.ok) {
      return {
        success: false,
        players: [],
        error:
          lang === 'id'
            ? `Gagal memuat event dari Reclub (Status: ${meetRes.status}). Silakan coba lagi atau gunakan tab "Salin Teks".`
            : `Failed to load event from Reclub (Status: ${meetRes.status}). Please try again or use the "Paste Names" tab.`,
      };
    }

    const meetJson = await meetRes.json();
    if (meetJson.code === 'not_found' || meetJson.error_code === 'not_found') {
      return {
        success: false,
        players: [],
        error:
          lang === 'id'
            ? 'Event tidak ditemukan di server Reclub. Pastikan kode link event sudah benar.'
            : 'Event not found on Reclub server. Please verify the event link code.',
      };
    }

    const meet = meetJson.body || meetJson;
    const rawParticipants: ReclubParticipant[] = Array.isArray(meet.participants) ? meet.participants : [];

    // Filter confirmed/approved players
    const approvedParticipants = rawParticipants.filter(
      p => p.status === MeetParticipantStatus.Approved
    );

    // Waitlist players
    const waitlistParticipants = rawParticipants.filter(
      p => p.status === MeetParticipantStatus.Waitlist
    );

    // Selected participants based on options
    let targetParticipants: ReclubParticipant[] = [...approvedParticipants];
    if (options.includeWaitlist) {
      targetParticipants = [...targetParticipants, ...waitlistParticipants];
    }

    // Sort participants by arrival order (updatedAt)
    targetParticipants.sort((a, b) => (Number(a.updatedAt) || 0) - (Number(b.updatedAt) || 0));

    // Collect userIds that need profile name lookup
    const userIdsToFetch = Array.from(
      new Set(
        targetParticipants
          .filter(
            p =>
              p.referenceId &&
              (p.referenceType === MeetParticipantType.User ||
                p.referenceType === MeetParticipantType.PlusOne ||
                p.referenceType === MeetParticipantType.Reserved)
          )
          .map(p => Number(p.referenceId))
          .filter(id => Number.isFinite(id) && id > 0)
      )
    );

    // Fetch user profiles in batches of 50
    const usersMap: Record<string | number, ReclubPlayerProfile> = {};
    if (userIdsToFetch.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < userIdsToFetch.length; i += batchSize) {
        const batch = userIdsToFetch.slice(i, i + batchSize);
        try {
          const playersUrl = `${RECLUB_API_BASE}/players/userIds?userIds=${batch.join(',')}`;
          const playersRes = await fetchWithCorsFallback(playersUrl, {
            'x-output-casing': 'camelCase',
          });

          if (playersRes.ok) {
            const playersJson = await playersRes.json();
            const playersList: ReclubPlayerProfile[] =
              playersJson.body?.players || playersJson.players || [];
            for (const pl of playersList) {
              if (pl?.userId) {
                usersMap[pl.userId] = pl;
              }
            }
          }
        } catch (fetchProfileErr) {
          console.warn('Could not batch fetch player profiles:', fetchProfileErr);
        }
      }
    }

    // Assemble final cleaned player names
    const resolvedNames: string[] = [];
    const seenNames = new Set<string>();

    for (const p of targetParticipants) {
      let candidateName = '';

      if (p.referenceId && usersMap[p.referenceId]) {
        const profile = usersMap[p.referenceId];
        candidateName = profile.name || profile.username || '';
      }

      if (!candidateName && p.name) {
        candidateName = p.name;
      }

      if (!candidateName && p.referenceId) {
        candidateName = `Player #${p.referenceId}`;
      }

      if (candidateName) {
        // Clean up with parseReclubText rules to remove badges, trailing status, etc.
        const cleanedArr = parseReclubText(candidateName);
        const finalName = cleanedArr[0] || candidateName.trim();

        if (finalName && !seenNames.has(finalName.toLowerCase())) {
          seenNames.add(finalName.toLowerCase());
          resolvedNames.push(finalName);
        }
      }
    }

    // Construct event details
    const eventDetails: ReclubEventDetails = {
      ref,
      title: meet.name || (lang === 'id' ? 'Pertandingan Reclub' : 'Reclub Match'),
      description: meet.description || meet.notes || undefined,
      venueName: meet.venue?.name || undefined,
      venueAddress: meet.venue?.location?.address || undefined,
      sportName: meet.sport?.name || undefined,
      numPlayers: meet.numPlayers || undefined,
      confirmedCount: approvedParticipants.length,
      waitlistCount: waitlistParticipants.length,
      totalParticipants: rawParticipants.length,
      startTime: meet.startTime || meet.startAt || undefined,
    };

    if (resolvedNames.length === 0) {
      return {
        success: false,
        players: [],
        eventDetails,
        error:
          lang === 'id'
            ? 'Event berhasil ditemukan tetapi belum memiliki peserta yang terkonfirmasi (Approved). Pastikan ada peserta terdaftar.'
            : 'Event found, but there are no approved attendees registered yet.',
      };
    }

    return {
      success: true,
      players: resolvedNames,
      eventDetails,
    };
  } catch (err: any) {
    console.error('Reclub fetch error:', err);
    return {
      success: false,
      players: [],
      error:
        lang === 'id'
          ? `Terjadi kesalahan saat menghubungi Reclub: ${err.message || 'Koneksi gagal'}. Silakan coba lagi atau gunakan tab "Salin Teks".`
          : `An error occurred while connecting to Reclub: ${err.message || 'Network error'}. Please try again or use the "Paste Names" tab.`,
    };
  }
}

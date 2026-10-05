/**
 * Reclub Attendees & Roster Parser Utility
 * Cleans copied attendee lists from Reclub app/web, WhatsApp, and CSV exports.
 */

export function parseReclubText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Keywords that often appear on their own lines when copying from Reclub or event platforms
  const skipLinePatterns = [
    /^attendees(\s*\(\d+\))?$/i,
    /^waitlist(\s*\(\d+\))?$/i,
    /^(host|co-host|organizer|admin|player|member|participant|participants)$/i,
    /^(going|attending|checked\s*in|registered|not\s*going|maybe)$/i,
    /^(paid|unpaid|pending|free|payment\s*received)$/i,
    /^level\s*[\d.]+/i,
    /^rating\s*[\d.]+/i,
    /^\d{1,2}:\d{2}\s*(am|pm)?$/i, // timestamps
    /^court\s*\d+/i,
    /^round\s*\d+/i,
    /^reclub/i,
  ];

  // Split lines by newline or comma/semicolon if single-line
  const lines = rawText.includes('\n') 
    ? rawText.split('\n') 
    : rawText.split(/[,;]+/);

  const cleanedNames: string[] = [];
  const seenLower = new Set<string>();

  for (const line of lines) {
    let text = line.trim();
    if (!text) continue;

    // Check if line is a metadata/status label to skip entirely
    if (skipLinePatterns.some(pattern => pattern.test(text))) {
      continue;
    }

    // Strip leading numbering: "1.", "1)", "#1", "1 -", "1. ", etc.
    text = text.replace(/^(\d+[\.\)\-:#]|\#\d+)\s*/, '');

    // Strip common trailing status badges: (Going), [Paid], (Host), - Paid, etc.
    text = text.replace(/\s*[\(\[\{](going|attending|paid|unpaid|host|organizer|admin|waitlist|guest|checked in|member|player)[\)\]\}]/gi, '');
    text = text.replace(/\s*-\s*(going|attending|paid|unpaid|host|organizer|waitlist|paid\s*via\s*reclub)$/gi, '');
    
    // Strip trailing or leading emojis and bullet characters (•, -, *, etc.)
    text = text.replace(/^[\s\-\*\•\–\—\>\#\@]+/, '');
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    // Strip skill rating mentions like "(3.5)" or "3.5 DUPR"
    text = text.replace(/\s*[\(\[]?(\b\d\.\d\b|\bdupr\b)[\)\]]?/gi, '');

    // Final trim
    text = text.trim();

    // Must be a plausible human name: at least 2 chars, contains letters, not just numbers
    if (text.length >= 2 && /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(text)) {
      const lower = text.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        cleanedNames.push(text);
      }
    }
  }

  return cleanedNames;
}

/**
 * Parse CSV / TXT file content for player names
 */
export function parseCSVAttendees(csvContent: string): string[] {
  if (!csvContent || !csvContent.trim()) return [];

  const rawLines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  // Check header line to find column index for "Name" or "Player"
  const header = rawLines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  let nameColIdx = header.findIndex(h => 
    h.includes('name') || h.includes('nama') || h.includes('player') || h.includes('pemain') || h.includes('attendee') || h.includes('member')
  );

  if (nameColIdx !== -1 && rawLines.length > 1) {
    // Column header found, parse that column from line 1 onward
    const names: string[] = [];
    for (let i = 1; i < rawLines.length; i++) {
      const row = rawLines[i].split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (row[nameColIdx]) {
        names.push(row[nameColIdx]);
      }
    }
    return parseReclubText(names.join('\n'));
  }

  // Fallback: parse entire content line by line using the smart Reclub parser
  return parseReclubText(csvContent);
}

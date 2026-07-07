/**
 * Emoji icon lookup for category chips.
 *
 * Categories in the DB have free-form names ("Dairy Goats", "Boer Goats",
 * "Poultry" …), so we match by lowercased tokens. Order matters: more
 * specific rules must come first (e.g. "chicks" before "chickens").
 *
 * If nothing matches, a generic 🌱 leaf is used — safe for any farm
 * product category.
 */
const RULES = [
  [/\b(all|everything|shop)\b/, '🛒'],
  [/\bdairy\b.*\bgoat/, '🐐'],
  [/\bboer\b.*\bgoat/, '🐐'],
  [/\bgoat/, '🐐'],
  [/\bcalf|\bcalves/, '🐮'],
  [/\bcattle|\bcow|\bbull|\bheifer|\bsteer/, '🐄'],
  [/\bsheep|\bram|\blamb/, '🐑'],
  [/\bpig|\bpork|\bhog|\bboar|\bsow/, '🐖'],
  [/\bchick(s|en|s)?\b/, '🐣'],
  [/\bhen|\brooster|\bpoultry|\blayer|\bkuroiler|\bkienyeji|\bkanga/, '🐔'],
  [/\begg/, '🥚'],
  [/\bmilk\b.*\bcan/, '🥛'],
  [/\bmilk\b|\bdairy\b/, '🥛'],
  [/\bincubator/, '🐣'],
  [/\bfertili[sz]er|\bmanure|\bcompost/, '🌱'],
  [/\bseedling|\bseed|\bplant/, '🌿'],
  [/\bhay|\bfodder|\bfeed|\bsilage/, '🌾'],
  [/\bmachinery|\bequipment|\btractor|\btool/, '⚙️'],
  [/\bfish|\baquacultur/, '🐟'],
  [/\brabbit/, '🐇'],
  [/\bbee|\bhoney|\bapiary/, '🐝'],
];

const FALLBACK = '🌱';

/**
 * @param {string|null|undefined} label — the category name/slug to match
 * @returns {string} an emoji character
 */
export function categoryIcon(label) {
  if (!label) return FALLBACK;
  const text = String(label).toLowerCase();
  for (const [rx, emoji] of RULES) {
    if (rx.test(text)) return emoji;
  }
  return FALLBACK;
}

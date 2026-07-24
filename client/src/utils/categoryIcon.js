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
  [/\bcrop\b|\bagronom/, '🌾'],
  [/\bcereal|\bgrain|\bmaize|\bwheat|\brice|\bbarley/, '🌽'],
  [/\blegume|\bpulse|\bbean|\blentil|\bsoy/, '🫘'],
  [/\boilseed|\bsunflower|\bcanola|\bgroundnut/, '🌻'],
  [/\bfiber|\bcotton|\bjute|\bhemp/, '🧵'],
  [/\bsugar/, '🍬'],
  [/\bhorticultur|\bfruit|\bpomolog/, '🍎'],
  [/\bvegetable|\bolericultur/, '🥬'],
  [/\bfloricultur|\bflower|\bornamental/, '🌸'],
  [/\blandscape/, '🏡'],
  [/\blivestock|\banimal\s*husband/, '🐄'],
  [/\bdairy\b.*\bgoat/, '🐐'],
  [/\bboer\b.*\bgoat/, '🐐'],
  [/\bgoat|\bsheep/, '🐐'],
  [/\bcalf|\bcalves/, '🐮'],
  [/\bcattle|\bcow|\bbull|\bheifer|\bsteer/, '🐄'],
  [/\bpig|\bpork|\bhog|\bsow|\bswine/, '🐖'],
  [/\bchick(s|en|s)?\b/, '🐣'],
  [/\bhen|\brooster|\bpoultry|\blayer|\bkuroiler|\bkienyeji|\bkanga/, '🐔'],
  [/\begg/, '🥚'],
  [/\bbee|\bhoney|\bapiary|\bapicultur/, '🐝'],
  [/\brabbit|\bcunicultur/, '🐇'],
  [/\bmilk\b.*\bcan/, '🥛'],
  [/\bmilk\b|\bdairy\b/, '🥛'],
  [/\bforest|\bsilvicultur|\btimber|\bagroforest/, '🌲'],
  [/\bfish|\baquacultur|\bshellfish|\bcrustacean|\bmarine/, '🐟'],
  [/\bincubator/, '🐣'],
  [/\bfertili[sz]er|\bmanure|\bcompost|\bsoil/, '🌱'],
  [/\bpesticide|\bagrochemical/, '🧴'],
  [/\bseedling|\bseed|\bplant\s*breeding/, '🌿'],
  [/\bhay|\bfodder|\bfeed|\bsilage/, '🌾'],
  [/\bmachinery|\bequipment|\btractor|\btool|\birrigation|\bengineering/, '⚙️'],
  [/\bagribusiness|\bmarketing|\bfinance|\binsurance|\blogistics|\btrade/, '💼'],
  [/\bfood\b|\bprocess|\bpreserv|\bsafety/, '🥗'],
  [/\bbiotech|\bgenetic|\bgmo|\bbreeding/, '🧬'],
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

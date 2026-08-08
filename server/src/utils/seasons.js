/**
 * Lightweight Kenya agri season calendar by category slug family.
 * Not farm advice — marketplace demand hints only.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** month index 0-11 */
const SEASONS = [
  {
    id: 'livestock_year_round',
    categories: ['livestock'],
    label: 'Livestock trade',
    peak_months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    note: 'Breeding stock and poultry move year-round; local festivals can spike demand.',
  },
  {
    id: 'horticulture_long_rains',
    categories: ['horticulture'],
    label: 'Horticulture (long rains window)',
    peak_months: [2, 3, 4, 5],
    note: 'Planting and fresh produce peak around the long rains (Mar–May).',
  },
  {
    id: 'horticulture_short_rains',
    categories: ['horticulture'],
    label: 'Horticulture (short rains window)',
    peak_months: [9, 10, 11],
    note: 'Second production push around short rains (Oct–Dec).',
  },
  {
    id: 'crops_harvest',
    categories: ['crop-production'],
    label: 'Crop harvest trade',
    peak_months: [6, 7, 8, 9],
    note: 'Post-harvest sales often peak mid-year into early Q4.',
  },
  {
    id: 'inputs_planting',
    categories: ['soil-science-inputs', 'agricultural-engineering'],
    label: 'Inputs & tools (planting)',
    peak_months: [1, 2, 3, 8, 9],
    note: 'Feed, fertilizer, and tools see demand before planting windows.',
  },
  {
    id: 'fisheries',
    categories: ['fisheries-aquaculture'],
    label: 'Fisheries & aquaculture',
    peak_months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    note: 'Fingerlings and feed trade steadily; watch local market days.',
  },
];

function getSeasonCalendar(now = new Date()) {
  const month = now.getMonth();
  const active = SEASONS.filter((s) => s.peak_months.includes(month)).map((s) => ({
    ...s,
    peak_month_names: s.peak_months.map((m) => MONTH_NAMES[m]),
    is_peak_now: true,
  }));
  const upcoming = SEASONS.filter((s) => !s.peak_months.includes(month)).map((s) => ({
    ...s,
    peak_month_names: s.peak_months.map((m) => MONTH_NAMES[m]),
    is_peak_now: false,
  }));
  return {
    current_month: MONTH_NAMES[month],
    current_month_index: month,
    active,
    all: [...active, ...upcoming],
  };
}

module.exports = {
  MONTH_NAMES,
  SEASONS,
  getSeasonCalendar,
};

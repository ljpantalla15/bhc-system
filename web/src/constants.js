// Code lists matching docs/DATA_DICTIONARY.md and docs/openapi.yaml

export const ZONES = [
  { id: 1, name: 'Purok 1', description: 'Riverside and main road' },
  { id: 2, name: 'Purok 2', description: 'Central residential area' },
  { id: 3, name: 'Purok 3', description: 'Upland zone' },
  { id: 4, name: 'Purok 4', description: 'Agricultural area' },
  { id: 5, name: 'Purok 5', description: 'Coastal strip' },
];

export const RELATIONS_TO_HEAD = [
  { code: 'HEAD', label: 'Head' },
  { code: 'SPOUSE', label: 'Spouse' },
  { code: 'SON', label: 'Son' },
  { code: 'DAUGHTER', label: 'Daughter' },
  { code: 'OTHER', label: 'Others (specify)' },
];

export const CIVIL_STATUSES = [
  { code: 'M', label: 'Married' },
  { code: 'S', label: 'Single' },
  { code: 'W', label: 'Widow/er' },
  { code: 'SP', label: 'Separated' },
  { code: 'C', label: 'Cohabitation' },
];

export const EDUCATION_LEVELS = [
  { code: 'N', label: 'None' },
  { code: 'PS', label: 'Pre-school' },
  { code: 'ES', label: 'Elementary student' },
  { code: 'EU', label: 'Elementary undergraduate' },
  { code: 'EG', label: 'Elementary graduate' },
  { code: 'HS', label: 'High school student' },
  { code: 'HU', label: 'High school undergraduate' },
  { code: 'HG', label: 'High school graduate' },
  { code: 'SH', label: 'Senior high school' },
  { code: 'ALS', label: 'Alternative Learning System' },
  { code: 'V', label: 'Vocational course' },
  { code: 'CS', label: 'College student' },
  { code: 'CU', label: 'College undergraduate' },
  { code: 'CG', label: 'College graduate' },
  { code: 'PG', label: 'Postgraduate / Doctorate' },
];

export const RELIGIONS = [
  { code: 'RC', label: 'Roman Catholic' },
  { code: 'CHR', label: 'Christian' },
  { code: 'INC', label: 'Iglesia ni Cristo' },
  { code: 'ISL', label: 'Islam' },
  { code: 'BAP', label: 'Baptist' },
  { code: 'BAC', label: 'Born Again Christian' },
  { code: 'BUD', label: 'Buddhism' },
  { code: 'COG', label: 'Church of God' },
  { code: 'JW', label: "Jehovah's Witness" },
  { code: 'PRO', label: 'Protestant' },
  { code: 'SDA', label: 'Seventh Day Adventist' },
  { code: 'LDS', label: 'LDS-Mormons' },
  { code: 'EVA', label: 'Evangelical' },
  { code: 'PEN', label: 'Pentecostal' },
  { code: 'UNK', label: 'Unknown' },
  { code: 'OTH', label: 'Others (specify)' },
];

export const MEDICAL_CONDITIONS = [
  { code: 'HPN', label: 'Hypertension (HPN)' },
  { code: 'DM', label: 'Diabetes Mellitus (DM)' },
  { code: 'TB', label: 'Tuberculosis (TB)' },
  { code: 'OTH', label: 'Others (specify)' },
];

export const DISABILITY_TYPES = [
  { code: 'LD', label: 'Learning disability' },
  { code: 'SPEECH', label: 'Speech impairment' },
  { code: 'PHYS', label: 'Physical disability' },
  { code: 'ORTHO', label: 'Orthopedic' },
  { code: 'VISUAL', label: 'Visual disability' },
  { code: 'DHH', label: 'Deaf and hard-of-hearing' },
  { code: 'INTEL', label: 'Intellectual disability' },
  { code: 'PSYCHO', label: 'Psychosocial disability' },
  { code: 'MENTAL', label: 'Mental disability' },
  { code: 'CANCER', label: 'Cancer' },
  { code: 'RARE', label: 'Rare disease' },
];

export const FP_METHODS = [
  { code: 'COC', label: 'COC (combined oral contraceptive)' },
  { code: 'POP', label: 'POP (progestin-only pill)' },
  { code: 'INJ', label: 'Injectable' },
  { code: 'WD', label: 'Withdrawal' },
  { code: 'IUD', label: 'IUD' },
  { code: 'CON', label: 'Condom' },
  { code: 'LAM', label: 'LAM (Lactational Amenorrhea Method)' },
  { code: 'BTL', label: 'BTL (Bilateral Tubal Ligation)' },
  { code: 'IMP', label: 'Implant' },
  { code: 'SDM', label: 'SDM (Standard Days Method)' },
  { code: 'DPT', label: 'DPT' },
  { code: 'OTH', label: 'Others (specify)' },
];

export const FP_STATUSES = [
  { code: 'NA', label: 'New acceptor' },
  { code: 'CU', label: 'Current user' },
  { code: 'CM', label: 'Changing method' },
  { code: 'CC', label: 'Changing clinic' },
  { code: 'DO', label: 'Dropout' },
  { code: 'R', label: 'Restarter' },
];

export const WATER_SOURCES = [
  { code: 'LV1', label: 'Level I - Point source (protected well/spring)' },
  { code: 'LV2', label: 'Level II - Communal faucet system or stand posts' },
  { code: 'LV3', label: 'Level III - Waterworks system / piped house connection' },
  { code: 'O', label: 'Doubtful sources (open dug well, surface water, etc.)' },
];

export const TOILET_FACILITIES = [
  { code: 'P', label: 'Pour/flush toilet connected to septic tank (Sanitary)', sanitary: true },
  { code: 'PF', label: 'Pour/flush connected to septic tank & sewerage (Sanitary)', sanitary: true },
  { code: 'VIP', label: 'Ventilated improved pit latrine or composting toilet (Sanitary)', sanitary: true },
  { code: 'WS', label: 'Water-sealed toilet connected to open drain (Unsanitary)', sanitary: false },
  { code: 'OH', label: 'Overhung latrine (Unsanitary)', sanitary: false },
  { code: 'OP', label: 'Open-pit latrine (Unsanitary)', sanitary: false },
  { code: 'WO', label: 'Without toilet facility (Unsanitary)', sanitary: false },
];

export const MASTERLIST_CATEGORIES = [
  { key: 'SENIOR_CITIZEN', label: 'Senior Citizens (60+)', desc: 'Residents aged 60 and older' },
  { key: 'UNDER_FIVE', label: 'Under-Five Children (0-4)', desc: 'Infants and young children' },
  { key: 'PREGNANT', label: 'Pregnant Women', desc: 'Active pregnant mothers' },
  { key: 'PWD', label: 'Persons with Disabilities (PWD)', desc: 'Residents registered with disability' },
];

export const AGE_RISK_GROUPS = {
  N: 'Newborn (0-28 days)',
  I: 'Infant (29 days - 11 mos)',
  PSAC: 'Preschool child (1-4 yrs)',
  SAC: 'School-age child (5-9 yrs)',
  AD: 'Adolescent (10-19 yrs)',
  A: 'Adult (20-59 yrs)',
  SC: 'Senior Citizen (60+ yrs)',
};

/* -------------------------------------------------------------------------- *
 * Programme colour is a system, not decoration: each masterlist programme
 * owns exactly one flat field, and every chip that carries that programme's
 * identity uses the same field. Nothing else in the app is allowed to be
 * these colours.
 * -------------------------------------------------------------------------- */
export const PROGRAMME_STYLE = {
  SENIOR_CITIZEN: { wall: 'wall-senior', chip: 'chip-senior', ink: '#7a5200' },
  UNDER_FIVE: { wall: 'wall-child', chip: 'chip-child', ink: '#0b7a3d' },
  PREGNANT: { wall: 'wall-maternal', chip: 'chip-maternal', ink: '#c22560' },
  PWD: { wall: 'wall-pwd', chip: 'chip-pwd', ink: '#5b3fa8' },
};

/** Target-group chips borrow a programme colour only when one owns them. */
export function ageGroupChip(group) {
  if (group === 'SC') return 'chip-senior';
  if (group === 'N' || group === 'I' || group === 'PSAC') return 'chip-child';
  return 'chip-plain';
}

/** The flat colour behind a chip, for surfaces that need a solid field. */
export const CHIP_HEX = {
  'chip-senior': '#f2b705',
  'chip-child': '#0b7a3d',
  'chip-maternal': '#c22560',
  'chip-pwd': '#5b3fa8',
  'chip-plain': '#aebecc',
};

/** Target group from a birth date, mirroring the API's age_risk_group codes. */
export function ageRiskGroup(dob, ref) {
  if (!dob) return null;
  const b = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  let years = ref.getFullYear() - b.getFullYear();
  const months = ref.getMonth() - b.getMonth();
  if (months < 0 || (months === 0 && ref.getDate() < b.getDate())) years -= 1;
  if (years < 0) return null;
  if (years === 0) return months <= 0 ? 'N' : 'I';
  if (years <= 4) return 'PSAC';
  if (years <= 9) return 'SAC';
  if (years <= 19) return 'AD';
  if (years <= 59) return 'A';
  return 'SC';
}

const AGE_GROUP_LABEL = {
  N: 'Newborn', I: 'Infant', PSAC: 'Preschool', SAC: 'School age',
  AD: 'Adolescent', A: 'Adult', SC: 'Senior citizen',
};

/**
 * A member's programme chip. Pregnancy and disability are programmes in their
 * own right and take precedence; otherwise the age group decides.
 */
export function memberChip(member, ref) {
  if (member.is_pregnant) return { cls: 'chip-maternal', label: 'Maternal' };
  if (member.is_pwd) return { cls: 'chip-pwd', label: 'PWD' };
  const g = ageRiskGroup(member.birth_date, ref);
  if (!g) return { cls: 'chip-plain', label: 'Age not set' };
  return { cls: ageGroupChip(g), label: AGE_GROUP_LABEL[g] };
}

/** Short target-group names, keyed by the API's age_risk_group code. */
export const AGE_GROUP_SHORT = AGE_GROUP_LABEL;

/** CSS variable for a chip class, used for folder-tab stripes. */
export const CHIP_VAR = {
  'chip-senior': 'var(--senior)',
  'chip-child': 'var(--child)',
  'chip-maternal': 'var(--maternal)',
  'chip-pwd': 'var(--pwd)',
  'chip-plain': 'var(--plain)',
};

/** Programme stripe for a resident row from the API (uses its age_risk_group). */
export function residentTab(r) {
  if (r.is_pregnant) return CHIP_VAR['chip-maternal'];
  if (r.is_pwd) return CHIP_VAR['chip-pwd'];
  return CHIP_VAR[ageGroupChip(r.age_risk_group)];
}

/** Masterlist category to its programme theme class. */
export const CATEGORY_THEME = {
  SENIOR_CITIZEN: 't-senior',
  UNDER_FIVE: 't-child',
  PREGNANT: 't-maternal',
  PWD: 't-pwd',
};

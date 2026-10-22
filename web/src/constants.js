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

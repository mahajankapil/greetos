import { prisma } from '../config/prisma';

/**
 * Admin-editable rules for the partner programme.
 *
 * Lives in the Setting table like the referral knobs do, so it can be changed
 * from the panel without a deploy. Nothing here is secret — `GET /api/settings`
 * is public and returns every row.
 */

export interface CreatorProgrammeSettings {
  /** A partner can't request a payout below this. Stops ₹20 withdrawals. */
  minPayout: number;
}

export const CREATOR_DEFAULTS: CreatorProgrammeSettings = {
  minPayout: 500,
};

export const CREATOR_SETTING_KEYS = {
  minPayout: 'creator_min_payout',
} as const;

function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function getCreatorSettings(): Promise<CreatorProgrammeSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(CREATOR_SETTING_KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    minPayout: Math.max(0, toInt(map[CREATOR_SETTING_KEYS.minPayout], CREATOR_DEFAULTS.minPayout)),
  };
}

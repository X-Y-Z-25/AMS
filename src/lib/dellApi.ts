/**
 * Dell TechDirect Warranty API Client
 * Docs: https://techdirect.dell.com/portal/APIs.aspx
 *
 * Store your credentials in .env as:
 *   VITE_DELL_CLIENT_ID=your_client_id
 *   VITE_DELL_CLIENT_SECRET=your_client_secret
 */

const DELL_AUTH_URL = 'https://apigtwb2c.us.dell.com/auth/oauth/v2/token';
const DELL_API_URL  = 'https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements';

const LS_KEY_CLIENT_ID     = 'dell_api_client_id';
const LS_KEY_CLIENT_SECRET = 'dell_api_client_secret';
const LS_KEY_TOKEN         = 'dell_api_token';
const LS_KEY_TOKEN_EXP     = 'dell_api_token_expiry';

// ── Credential helpers ──────────────────────────────────────────────────────

export function saveDellCredentials(clientId: string, clientSecret: string) {
  localStorage.setItem(LS_KEY_CLIENT_ID, clientId);
  localStorage.setItem(LS_KEY_CLIENT_SECRET, clientSecret);
  // Clear any cached token when credentials change
  localStorage.removeItem(LS_KEY_TOKEN);
  localStorage.removeItem(LS_KEY_TOKEN_EXP);
}

export function getDellCredentials(): { clientId: string; clientSecret: string } | null {
  // Prefer .env values; fall back to localStorage (runtime-entered)
  const clientId = (import.meta.env.VITE_DELL_CLIENT_ID as string) || localStorage.getItem(LS_KEY_CLIENT_ID) || '';
  const clientSecret = (import.meta.env.VITE_DELL_CLIENT_SECRET as string) || localStorage.getItem(LS_KEY_CLIENT_SECRET) || '';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function hasDellCredentials(): boolean {
  return getDellCredentials() !== null;
}

export function clearDellCredentials() {
  localStorage.removeItem(LS_KEY_CLIENT_ID);
  localStorage.removeItem(LS_KEY_CLIENT_SECRET);
  localStorage.removeItem(LS_KEY_TOKEN);
  localStorage.removeItem(LS_KEY_TOKEN_EXP);
}

// ── OAuth2 token management ─────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  const cached = localStorage.getItem(LS_KEY_TOKEN);
  const expiry  = parseInt(localStorage.getItem(LS_KEY_TOKEN_EXP) || '0', 10);
  if (cached && Date.now() < expiry - 60000) return cached;

  const creds = getDellCredentials();
  if (!creds) throw new Error('Dell API credentials not configured.');

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await fetch(DELL_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dell OAuth2 failed (${res.status}): ${text}`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();
  const newExpiry = Date.now() + data.expires_in * 1000;
  localStorage.setItem(LS_KEY_TOKEN, data.access_token);
  localStorage.setItem(LS_KEY_TOKEN_EXP, String(newExpiry));
  return data.access_token;
}

// ── Data types ──────────────────────────────────────────────────────────────

export interface DellEntitlement {
  itemNumber: string;
  startDate: string;
  endDate: string;
  serviceLevelDescription: string;
  serviceLevelCode: string;
}

export interface DellAssetInfo {
  serviceTag: string;
  shipDate: string | null;
  productCode: string;
  productId: string;
  productLineDescription: string;
  systemDescription: string;
  productFamily: string;
  productLobDescription: string;
  countryCode: string;
  duplicated: boolean;
  invalid: boolean;
  entitlements: DellEntitlement[];
  // Computed helpers
  warrantyEndDate: string | null;
  warrantyStartDate: string | null;
  serviceLevelDescription: string | null;
  isUnderWarranty: boolean;
  daysUntilExpiry: number | null;
}

// ── API Calls ───────────────────────────────────────────────────────────────

/**
 * Lookup warranty info for up to 100 service tags at once.
 */
export async function lookupWarranty(serviceTags: string[]): Promise<DellAssetInfo[]> {
  if (serviceTags.length === 0) return [];
  const chunks = chunkArray(serviceTags, 100);
  const results: DellAssetInfo[] = [];

  const token = await getAccessToken();

  for (const chunk of chunks) {
    const url = `${DELL_API_URL}?servicetags=${encodeURIComponent(chunk.join(','))}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dell API error (${res.status}): ${text}`);
    }
    const raw: RawDellAsset[] = await res.json();
    results.push(...raw.map(normalizeAsset));
  }
  return results;
}

/**
 * Lookup a single service tag. Returns null if not found / invalid.
 */
export async function lookupSingleWarranty(serviceTag: string): Promise<DellAssetInfo | null> {
  const results = await lookupWarranty([serviceTag]);
  const found = results.find((r) => r.serviceTag.toLowerCase() === serviceTag.toLowerCase());
  return found ?? null;
}

/**
 * Test connectivity with current credentials.
 * Returns { success, message }.
 */
export async function testDellConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    if (token) return { success: true, message: 'Connected to Dell TechDirect API successfully.' };
    return { success: false, message: 'Token was empty.' };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

interface RawDellEntitlement {
  itemNumber: string;
  startDate: string;
  endDate: string;
  serviceLevelDescription: string;
  serviceLevelCode: string;
}

interface RawDellAsset {
  serviceTag: string;
  shipDate?: string;
  productCode?: string;
  productId?: string;
  productLineDescription?: string;
  systemDescription?: string;
  productFamily?: string;
  productLobDescription?: string;
  countryCode?: string;
  duplicated?: boolean;
  invalid?: boolean;
  entitlements?: RawDellEntitlement[];
}

function normalizeAsset(raw: RawDellAsset): DellAssetInfo {
  const entitlements: DellEntitlement[] = (raw.entitlements ?? []).map((e) => ({
    itemNumber: e.itemNumber,
    startDate: e.startDate,
    endDate: e.endDate,
    serviceLevelDescription: e.serviceLevelDescription,
    serviceLevelCode: e.serviceLevelCode,
  }));

  // Sort entitlements by endDate descending to find latest
  const sorted = [...entitlements].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const latest = sorted[0] ?? null;

  const warrantyEndDate   = latest?.endDate ?? null;
  const warrantyStartDate = sorted[sorted.length - 1]?.startDate ?? null;
  const now = Date.now();
  const endMs = warrantyEndDate ? new Date(warrantyEndDate).getTime() : null;
  const daysUntilExpiry = endMs !== null ? Math.floor((endMs - now) / 86400000) : null;

  return {
    serviceTag:              raw.serviceTag,
    shipDate:                raw.shipDate ?? null,
    productCode:             raw.productCode ?? '',
    productId:               raw.productId ?? '',
    productLineDescription:  raw.productLineDescription ?? '',
    systemDescription:       raw.systemDescription ?? '',
    productFamily:           raw.productFamily ?? '',
    productLobDescription:   raw.productLobDescription ?? '',
    countryCode:             raw.countryCode ?? '',
    duplicated:              raw.duplicated ?? false,
    invalid:                 raw.invalid ?? false,
    entitlements,
    warrantyEndDate,
    warrantyStartDate,
    serviceLevelDescription: latest?.serviceLevelDescription ?? null,
    isUnderWarranty:         daysUntilExpiry !== null && daysUntilExpiry > 0,
    daysUntilExpiry,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

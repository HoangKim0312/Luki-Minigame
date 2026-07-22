type SupabaseOptions = RequestInit & { serviceRole?: boolean };

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseAuthUser;
};

const url = () => process.env.SUPABASE_URL?.replace(/\/$/, "");
const anonKey = () => process.env.SUPABASE_ANON_KEY?.trim();
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function isSupabaseConfigured() {
  return Boolean(
    url() &&
    serviceKey() &&
    !url()?.includes("YOUR_PROJECT_REF") &&
    !serviceKey()?.startsWith("replace-with"),
  );
}

function configuredKey(serviceRole: boolean) {
  const key = serviceRole ? serviceKey() : (anonKey() || serviceKey());
  if (!url() || !key) throw new Error("Supabase chưa được cấu hình đầy đủ.");
  return key;
}

async function request<T>(path: string, options: SupabaseOptions = {}) {
  const key = configuredKey(options.serviceRole ?? false);
  const response = await fetch(`${url()}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { message?: string; msg?: string; error_description?: string } : undefined;
  if (!response.ok) {
    throw new Error(data?.message || data?.msg || data?.error_description || `Supabase request failed (${response.status})`);
  }
  return data as T;
}

export function supabaseRest<T>(path: string, options: SupabaseOptions = {}) {
  return request<T>(`/rest/v1/${path}`, { ...options, serviceRole: true });
}

export async function createSupabaseAccount(input: { email: string; password: string; displayName: string; locale?: "vi" | "en" }) {
  await request<SupabaseAuthUser>("/auth/v1/admin/users", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName, locale: input.locale ?? "vi" },
    }),
  });
  return signInWithSupabase(input.email, input.password);
}

export function signInWithSupabase(email: string, password: string) {
  return request<SupabaseSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refreshSupabaseSession(refreshToken: string) {
  return request<SupabaseSession>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function getSupabaseUser(accessToken: string) {
  const key = configuredKey(false);
  const response = await fetch(`${url()}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return response.json() as Promise<SupabaseAuthUser>;
}

export async function getSupabaseProfile(userId: string) {
  const profiles = await supabaseRest<Array<{ id: string; display_name: string; role: "admin" | "player"; locale: "vi" | "en" }>>(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,role,locale&limit=1`,
  );
  return profiles[0];
}

const BASE_URL = '/api/v1';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string; error?: any }> {
  const token = localStorage.getItem('pb_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || json.message || 'API request failed');
    }
    return json;
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

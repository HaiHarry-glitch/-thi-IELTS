export interface StudentInfo {
  email: string;
  name: string;
  class: string;
}

const CACHE_KEY = 'hin_student_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function getCachedStudent(): StudentInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: StudentInfo; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedStudent(student: StudentInfo): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data: student, ts: Date.now() }));
}

export function clearCachedStudent(): void {
  localStorage.removeItem(CACHE_KEY);
}

export async function lookupStudent(
  email: string,
  klass: string,
): Promise<StudentInfo> {
  const url = process.env.NEXT_PUBLIC_TRACKING_GAS_URL;
  if (!url) throw new Error('NEXT_PUBLIC_TRACKING_GAS_URL chưa được cấu hình');

  const res = await fetch(
    `${url}?action=lookupStudent&email=${encodeURIComponent(email)}&class=${encodeURIComponent(klass)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`Lỗi kết nối (HTTP ${res.status})`);
  const json = (await res.json()) as { ok: boolean; name?: string; class?: string; error?: string };
  if (!json.ok) throw new Error(json.error || 'Không tìm thấy trong danh sách');
  return { email: email.trim().toLowerCase(), name: json.name!, class: json.class! };
}

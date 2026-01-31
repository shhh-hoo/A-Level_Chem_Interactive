import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type JoinResponse = {
  session_token: string;
  student_profile: {
    id: string;
    class_code: string;
    display_name: string;
  };
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const functionsBaseUrl =
  Deno.env.get("SUPABASE_FUNCTIONS_URL") ??
  (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined);

if (!supabaseUrl || !serviceRoleKey || !functionsBaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_FUNCTIONS_URL.",
  );
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const randomSuffix = () => crypto.randomUUID().slice(0, 8);
export const makeClassCode = () => `class_${randomSuffix()}`;
export const makeStudentCode = () => `student_${randomSuffix()}`;
export const makeTeacherCode = () => `teach_${randomSuffix()}`;
export const makeActivityId = () => `activity_${randomSuffix()}`;
export const makeRateLimitIp = (octet = Math.floor(Math.random() * 200) + 1) =>
  `203.0.113.${octet}`;

export async function sleep(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(resp: Response) {
  // Always consume the response body exactly once.
  const raw = await resp.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON. Body: ${raw}`);
  }
}

async function expectStatus(resp: Response, expected: number): Promise<void> {
  if (resp.status !== expected) {
    // Drain body on failure to avoid leaks and include it in error for debugging.
    const body = await resp.text();
    throw new Error(`Expected ${expected}, got ${resp.status}. Body: ${body}`);
  }
}

async function discardBody(resp: Response): Promise<void> {
  // Cancel the body stream when we don't need it to avoid leak warnings.
  try {
    await resp.body?.cancel();
  } catch {
    // Ignore if already consumed/locked.
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit,
  expected = 200,
): Promise<T> {
  const resp = await fetch(url, init);
  await expectStatus(resp, expected);
  return (await readJson(resp)) as T;
}

export async function fetchErrorJson<T>(
  url: string,
  init: RequestInit,
  expected: number,
): Promise<T> {
  const resp = await fetch(url, init);
  await expectStatus(resp, expected);
  return (await readJson(resp)) as T;
}

export async function fetchDiscard(
  url: string,
  init: RequestInit,
  expected = 200,
): Promise<void> {
  const resp = await fetch(url, init);
  await expectStatus(resp, expected);
  await discardBody(resp);
}

export async function createClass(
  classCode: string,
  teacherCodeHash = `hash_${crypto.randomUUID()}`,
): Promise<void> {
  const { error } = await supabase.from("classes").insert({
    class_code: classCode,
    name: "Edge Function Test Class",
    teacher_code_hash: teacherCodeHash,
  });

  if (error) {
    throw new Error(`Failed to insert class: ${error.message}`);
  }
}

export async function cleanupTestData(params: {
  classCode: string;
  studentId?: string;
  studentIds?: string[];
  rateLimitIp: string;
}): Promise<void> {
  const { classCode, studentId, studentIds, rateLimitIp } = params;

  // Cleaning in dependency order prevents foreign key errors when rows exist.
  const idsToCleanup = [studentId, ...(studentIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );

  for (const id of idsToCleanup) {
    await supabase.from("progress").delete().eq("student_id", id);
    await supabase.from("sessions").delete().eq("student_id", id);
    await supabase.from("students").delete().eq("id", id);
  }

  await supabase.from("classes").delete().eq("class_code", classCode);
  await supabase.from("rate_limits").delete().eq("ip", rateLimitIp);
}

export async function joinSession(params: {
  classCode: string;
  studentCode: string;
  displayName: string;
  rateLimitIp: string;
}): Promise<JoinResponse> {
  return await fetchJson<JoinResponse>(`${functionsBaseUrl}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": params.rateLimitIp,
    },
    body: JSON.stringify({
      class_code: params.classCode,
      student_code: params.studentCode,
      display_name: params.displayName,
    }),
  }, 200);
}

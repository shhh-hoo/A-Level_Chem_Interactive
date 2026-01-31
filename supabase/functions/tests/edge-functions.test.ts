import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../_shared/hash.ts";
import {
  cleanupTestData,
  createClass,
  fetchDiscard,
  fetchJson,
  joinSession,
  makeActivityId,
  makeClassCode,
  makeRateLimitIp,
  makeStudentCode,
  makeTeacherCode,
  sleep,
  supabase,
  functionsBaseUrl,
} from "./edge-functions.test-helpers.ts";

Deno.test("POST /join creates a session", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Student";
  const rateLimitIp = makeRateLimitIp();
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const payload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    assertExists(payload.session_token);
    assertExists(payload.student_profile);
    assertEquals(payload.student_profile.display_name, displayName);

    studentId = payload.student_profile.id;

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("student_id")
      .eq("student_id", studentId);

    if (error) {
      throw new Error(`Failed to load sessions: ${error.message}`);
    }

    assertEquals(sessions?.length, 1);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("POST /save updates progress and updated_at", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Saver";
  const rateLimitIp = makeRateLimitIp();
  const activityId = makeActivityId();
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const joinPayload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const savePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: activityId,
            state: { progress: 0.7 },
          },
        ],
      }),
    }, 200);

    assertExists(savePayload.updated_at);
    assertEquals(savePayload.progress?.length, 1);

    const { data: progressRows, error } = await supabase
      .from("progress")
      .select("activity_id, state, updated_at")
      .eq("student_id", studentId)
      .eq("activity_id", activityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load progress: ${error.message}`);
    }

    assertExists(progressRows);
    assertEquals(progressRows.activity_id, activityId);
    assertEquals(progressRows.state, { progress: 0.7 });

    // Compare timestamps by instant, not by string formatting.
    assertEquals(
      new Date(progressRows.updated_at).getTime(),
      new Date(savePayload.updated_at).getTime(),
    );
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /load returns progress with optional since filter", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Loader";
  const rateLimitIp = makeRateLimitIp();
  const firstActivityId = makeActivityId();
  const secondActivityId = makeActivityId();
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const joinPayload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const firstSavePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: firstActivityId,
            state: { progress: 0.1 },
          },
        ],
      }),
    }, 200);
    assertExists(firstSavePayload.updated_at);

    await sleep(10);

    const secondSavePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: secondActivityId,
            state: { progress: 0.9 },
          },
        ],
      }),
    }, 200);
    assertExists(secondSavePayload.updated_at);

    const loadPayload = await fetchJson<any>(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${joinPayload.session_token}`,
      },
    }, 200);

    const activityIds = (loadPayload?.progress ?? []).map(
      (item: { activity_id: string }) => item.activity_id,
    );
    assertEquals(new Set(activityIds), new Set([firstActivityId, secondActivityId]));

    const sincePayload = await fetchJson<any>(
      `${functionsBaseUrl}/load?since=${encodeURIComponent(firstSavePayload.updated_at)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${joinPayload.session_token}`,
        },
      },
      200,
    );

    assertEquals(sincePayload?.progress?.length, 1);
    assertEquals(sincePayload?.progress?.[0]?.activity_id, secondActivityId);

    await fetchDiscard(`${functionsBaseUrl}/load`, { method: "GET" }, 401);

    await fetchDiscard(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: "Bearer invalid-token",
      },
    }, 401);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /teacher/report returns aggregates with valid teacher code", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstDisplayName = "Edge Learner One";
  const secondDisplayName = "Edge Learner Two";
  const firstRateLimitIp = makeRateLimitIp();
  const secondRateLimitIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const firstActivityId = makeActivityId();
  const secondActivityId = makeActivityId();
  const studentIds: string[] = [];

  try {
    await createClass(classCode, teacherCodeHash);

    const firstJoin = await joinSession({
      classCode,
      studentCode: firstStudentCode,
      displayName: firstDisplayName,
      rateLimitIp: firstRateLimitIp,
    });
    const secondJoin = await joinSession({
      classCode,
      studentCode: secondStudentCode,
      displayName: secondDisplayName,
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${firstJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: firstActivityId,
            state: { progress: 0.4 },
          },
        ],
      }),
    }, 200);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secondJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: secondActivityId,
            state: { progress: 0.9 },
          },
        ],
      }),
    }, 200);

    const reportPayload = await fetchJson<any>(
      `${functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=${encodeURIComponent(teacherCode)}`,
      { method: "GET" },
      200,
    );

    assertEquals(reportPayload?.totals?.students, 2);

    const activityTotals = new Map(
      (reportPayload?.activities ?? []).map(
        (activity: { activity_id: string; total: number }) => [
          activity.activity_id,
          activity.total,
        ],
      ),
    );

    assertEquals(activityTotals.has(firstActivityId), true);
    assertEquals(activityTotals.has(secondActivityId), true);

    const firstTotal = activityTotals.get(firstActivityId);
    assert(typeof firstTotal === "number" && firstTotal > 0);

    const secondTotal = activityTotals.get(secondActivityId);
    assert(typeof secondTotal === "number" && secondTotal > 0);

    const leaderboardEntries = reportPayload?.leaderboard ?? [];
    const leaderboardByName = new Map(
      leaderboardEntries.map(
        (entry: { display_name: string; completed: number }) => [
          entry.display_name,
          entry.completed,
        ],
      ),
    );

    assertEquals(leaderboardByName.get(firstDisplayName), 1);
    assertEquals(leaderboardByName.get(secondDisplayName), 1);
  } finally {
    await cleanupTestData({
      classCode,
      studentIds,
      rateLimitIp: firstRateLimitIp,
    });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

Deno.test("GET /teacher/report returns 403 for invalid teacher code", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const rateLimitIp = makeRateLimitIp();

  try {
    await createClass(classCode, teacherCodeHash);

    await fetchDiscard(
      `${functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=invalid-code`,
      { method: "GET" },
      403,
    );
  } finally {
    await cleanupTestData({ classCode, rateLimitIp });
  }
});

Deno.test("Sessions cannot read or write another student's progress", async () => {
  const classCode = makeClassCode();
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstDisplayName = "Isolated Learner A";
  const secondDisplayName = "Isolated Learner B";
  const firstRateLimitIp = makeRateLimitIp();
  const secondRateLimitIp = makeRateLimitIp();
  const sharedActivityId = makeActivityId();
  const studentIds: string[] = [];

  try {
    await createClass(classCode);

    const firstJoin = await joinSession({
      classCode,
      studentCode: firstStudentCode,
      displayName: firstDisplayName,
      rateLimitIp: firstRateLimitIp,
    });
    const secondJoin = await joinSession({
      classCode,
      studentCode: secondStudentCode,
      displayName: secondDisplayName,
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secondJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: sharedActivityId,
            state: { progress: 0.6 },
          },
        ],
      }),
    }, 200);

    const firstLoad = await fetchJson<any>(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${firstJoin.session_token}`,
      },
    }, 200);

    const firstActivityIds = (firstLoad?.progress ?? []).map(
      (item: { activity_id: string }) => item.activity_id,
    );
    assertEquals(firstActivityIds.includes(sharedActivityId), false);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${firstJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: sharedActivityId,
            state: { progress: 0.2 },
          },
        ],
      }),
    }, 200);

    // Use the same activity id to ensure writes remain scoped to the owning session.
    const secondLoad = await fetchJson<any>(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secondJoin.session_token}`,
      },
    }, 200);

    const secondProgress = (secondLoad?.progress ?? []).find(
      (item: { activity_id: string }) => item.activity_id === sharedActivityId,
    );
    assertExists(secondProgress);
    assertEquals(secondProgress.state, { progress: 0.6 });
  } finally {
    await cleanupTestData({
      classCode,
      studentIds,
      rateLimitIp: firstRateLimitIp,
    });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cleanupTestData,
  createClass,
  fetchErrorJson,
  joinSession,
  makeClassCode,
  makeRateLimitIp,
  makeStudentCode,
  functionsBaseUrl,
} from "./edge-functions.test-helpers.ts";

Deno.test("POST /join rejects malformed or missing fields", async () => {
  const rateLimitIp = makeRateLimitIp();

  const missingFieldPayload = await fetchErrorJson<any>(
    `${functionsBaseUrl}/join`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": rateLimitIp,
      },
      body: JSON.stringify({
        class_code: "ab",
        student_code: "cd",
      }),
    },
    400,
  );

  assertEquals(missingFieldPayload?.error?.code, "bad_request");
  assertEquals(missingFieldPayload?.error?.message, "Validation failed.");

  const invalidJsonPayload = await fetchErrorJson<any>(
    `${functionsBaseUrl}/join`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": rateLimitIp,
      },
      body: "{",
    },
    400,
  );

  assertEquals(invalidJsonPayload?.error?.code, "bad_request");
  assertEquals(invalidJsonPayload?.error?.message, "Invalid JSON body.");
});

Deno.test("POST /save rejects malformed or missing updates", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Invalid Saver";
  const rateLimitIp = makeRateLimitIp();
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

    const missingUpdatesPayload = await fetchErrorJson<any>(
      `${functionsBaseUrl}/save`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${joinPayload.session_token}`,
        },
        body: JSON.stringify({}),
      },
      400,
    );

    assertEquals(missingUpdatesPayload?.error?.code, "bad_request");
    assertEquals(missingUpdatesPayload?.error?.message, "Validation failed.");

    const emptyUpdatesPayload = await fetchErrorJson<any>(
      `${functionsBaseUrl}/save`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${joinPayload.session_token}`,
        },
        body: JSON.stringify({ updates: [] }),
      },
      400,
    );

    assertEquals(emptyUpdatesPayload?.error?.code, "bad_request");
    assertEquals(emptyUpdatesPayload?.error?.message, "Validation failed.");
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /load rejects malformed query values", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Invalid Loader";
  const rateLimitIp = makeRateLimitIp();
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

    const invalidSincePayload = await fetchErrorJson<any>(
      `${functionsBaseUrl}/load?since=not-a-date`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${joinPayload.session_token}`,
        },
      },
      400,
    );

    assertEquals(invalidSincePayload?.error?.code, "bad_request");
    assertEquals(invalidSincePayload?.error?.message, "Validation failed.");
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

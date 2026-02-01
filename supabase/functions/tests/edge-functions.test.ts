// Legacy entrypoint preserved for compatibility. It now forwards to the new
// unit + integration suites so existing tooling can still invoke a single file.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../_shared/hash.ts";
import { cleanupTestData } from "./testkit/cleanup.ts";
import { createServiceClient, loadTestConfig } from "./testkit/config.ts";
import { createClass, joinSession, teacherReport } from "./testkit/fixtures.ts";
import {
  makeActivityId,
  makeClassCode,
  makeRateLimitIp,
  makeStudentCode,
  makeTeacherCode,
} from "./testkit/ids.ts";
import "./unit/hash.test.ts";
import "./unit/validators.test.ts";
import "./integration/join.test.ts";
import "./integration/save-load.test.ts";
import "./integration/teacher-report.test.ts";
import "./integration/isolation.test.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

Deno.test("GET /teacher/report aggregates coverage and weak topics", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstRateLimitIp = makeRateLimitIp(110);
  const secondRateLimitIp = makeRateLimitIp(111);
  const studentIds: string[] = [];

  const progressRows = [
    {
      activity_id: makeActivityId(),
      state: { progress: 0.2, topic: "Equilibria" },
      updated_at: "2024-01-02T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.8, topic: "Kinetics" },
      updated_at: "2024-01-03T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.6, topic: "Equilibria" },
      updated_at: "2024-01-04T00:00:00.000Z",
    },
    {
      activity_id: makeActivityId(),
      state: { progress: 0.4, topic: "Kinetics" },
      updated_at: "2024-01-05T00:00:00.000Z",
    },
  ];

  try {
    await createClass(supabase, classCode, teacherCodeHash);

    const firstJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: firstStudentCode,
      displayName: "Coverage Student One",
      rateLimitIp: firstRateLimitIp,
    });

    const secondJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: secondStudentCode,
      displayName: "Coverage Student Two",
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    // Insert deterministic progress rows directly so aggregation math is stable.
    const insertRows = [
      { ...progressRows[0], student_id: firstJoin.student_profile.id },
      { ...progressRows[1], student_id: firstJoin.student_profile.id },
      { ...progressRows[2], student_id: secondJoin.student_profile.id },
      { ...progressRows[3], student_id: secondJoin.student_profile.id },
    ];

    const { error: progressError } = await supabase.from("progress").insert(insertRows);
    if (progressError) {
      throw new Error(`Failed to seed progress rows: ${progressError.message}`);
    }

    const report = await teacherReport({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      teacherCode,
    });

    assertEquals(report.totals?.students, 2);
    assertEquals(report.totals?.coverage, 0.5);
    assertEquals(report.weak_topics, [
      { topic: "Equilibria", average_progress: 0.4, total: 2 },
      { topic: "Kinetics", average_progress: 0.6, total: 2 },
    ]);
  } finally {
    await cleanupTestData({ supabase, classCode, studentIds, rateLimitIp: firstRateLimitIp });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

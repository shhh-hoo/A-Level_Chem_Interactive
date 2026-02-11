import { createHash, randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const serverSalt = process.env.SERVER_SALT;
if (!serverSalt) {
  throw new Error('SERVER_SALT is required to generate demo hashes.');
}

const seedDir = path.dirname(fileURLToPath(import.meta.url));
const classCode = process.env.DEMO_CLASS_CODE ?? `demo-${randomBytes(3).toString('hex')}`;
const className = process.env.DEMO_CLASS_NAME ?? 'Demo Class';
const teacherCode = process.env.DEMO_TEACHER_CODE ?? `teacher-${randomBytes(4).toString('hex')}`;
const manualTestClassCode = process.env.MANUAL_TEST_CLASS_CODE ?? 'manual-test-chem';
const manualTestClassName = process.env.MANUAL_TEST_CLASS_NAME ?? 'Manual Test Class';
const manualTestTeacherCode = process.env.MANUAL_TEST_TEACHER_CODE ?? 'manual-teacher-001';
const manualTestStudentCode = process.env.MANUAL_TEST_STUDENT_CODE ?? 'manual-student-001';
const manualTestStudentName = process.env.MANUAL_TEST_STUDENT_NAME ?? 'Manual Test Student';

const sqlEscape = (value) => value.replace(/'/g, "''");

const hashCode = (code, scopedClassCode = classCode) =>
  createHash('sha256')
    .update(`${code}:${scopedClassCode}:${serverSalt}`)
    .digest('hex');

const studentCodes = Array.from({ length: 10 }, (_, index) => {
  const suffix = String(index + 1).padStart(2, '0');
  return `student-${randomBytes(2).toString('hex')}-${suffix}`;
});

const teacherHash = hashCode(teacherCode, classCode);
const manualTestTeacherHash = hashCode(manualTestTeacherCode, manualTestClassCode);
const manualTestStudentHash = hashCode(manualTestStudentCode, manualTestClassCode);

const classRows = [
  `  ('${sqlEscape(classCode)}', '${sqlEscape(className)}', '${teacherHash}')`,
  `  ('${sqlEscape(manualTestClassCode)}', '${sqlEscape(manualTestClassName)}', '${manualTestTeacherHash}')`,
].join(',\n');

const randomStudentRows = studentCodes.map((studentCode, index) => {
  const displayName = `Student ${index + 1}`;
  const studentHash = hashCode(studentCode, classCode);
  return `  (gen_random_uuid(), '${sqlEscape(classCode)}', '${studentHash}', '${sqlEscape(displayName)}')`;
});

// Keep one deterministic student row so manual QA can always join with known credentials.
const studentRows = [
  `  (gen_random_uuid(), '${sqlEscape(manualTestClassCode)}', '${manualTestStudentHash}', '${sqlEscape(manualTestStudentName)}')`,
  ...randomStudentRows,
].join(',\n');

const sql = `-- Auto-generated demo seed.\n` +
  `-- Class code: ${classCode}\n` +
  `-- Teacher code: ${teacherCode}\n` +
  `-- Manual test class code: ${manualTestClassCode}\n` +
  `-- Manual test teacher code: ${manualTestTeacherCode}\n` +
  `-- Manual test student code: ${manualTestStudentCode}\n` +
  `-- Student codes written to demo-codes.txt\n\n` +
  `insert into classes (class_code, name, teacher_code_hash)\n` +
  `values\n${classRows}\n` +
  `on conflict (class_code) do update\n` +
  `  set name = excluded.name,\n` +
  `      teacher_code_hash = excluded.teacher_code_hash;\n\n` +
  `insert into students (id, class_code, student_code_hash, display_name)\n` +
  `values\n${studentRows}\n` +
  `on conflict (class_code, student_code_hash) do nothing;\n`;

const codesOutput = [
  `class_code: ${classCode}`,
  `teacher_code: ${teacherCode}`,
  ...studentCodes.map((code, index) => `student_${index + 1}_code: ${code}`),
  '',
  `manual_test_class_code: ${manualTestClassCode}`,
  `manual_test_teacher_code: ${manualTestTeacherCode}`,
  `manual_test_student_1_code: ${manualTestStudentCode}`,
  `manual_test_student_1_name: ${manualTestStudentName}`,
].join('\n');

writeFileSync(path.join(seedDir, 'seed-demo.sql'), sql);
writeFileSync(path.join(seedDir, 'demo-codes.txt'), codesOutput);

console.log('Seed SQL written to supabase/seed/seed-demo.sql');
console.log('Plaintext codes written to supabase/seed/demo-codes.txt');

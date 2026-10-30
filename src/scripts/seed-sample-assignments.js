const { Client } = require('pg');

async function seedAssignments() {
  const databaseUrl = process.env.DATABASE_URL;
  const client = new Client(
    databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          user: process.env.DB_USERNAME || 'rl_admin',
          password: process.env.DB_PASSWORD || 'admin',
          database: process.env.DB_NAME || 'toeic_db',
        },
  );

  await client.connect();

  try {
    const teacherRes = await client.query(`SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1`);
    const studentRes = await client.query(`SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1`);
    const classRes = await client.query(`SELECT id FROM classes LIMIT 1`);

    if (!teacherRes.rows[0] || !studentRes.rows[0] || !classRes.rows[0]) {
      console.log('⚠️ Thiếu dữ liệu teacher, student hoặc class.');
      return;
    }

    const teacherId = teacherRes.rows[0].id;
    const studentId = studentRes.rows[0].id;
    const classId = classRes.rows[0].id;

    // 1. Tạo đề Writing
    const writingRes = await client.query(`
      INSERT INTO assignments (
        title, type, instructions, rubric, created_by
      ) VALUES (
        $1, 'WRITING', $2, $3, $4
      ) RETURNING id;
    `, [
      'TOEIC Writing Part 3: Write an Opinion Essay (Remote Work)',
      'There is a proposal to allow employees to work remotely two days a week. Do you agree or disagree with this proposal? Support your opinion with reasons and detailed workplace examples.',
      JSON.stringify({
        minWords: 150,
        maxWords: 300,
        timeLimitMinutes: 30,
        criteria: [
          { key: 'TASK_ACHIEVEMENT', name: 'Task Achievement', maxScore: 10, weight: 25 },
          { key: 'COHERENCE_COHESION', name: 'Coherence & Cohesion', maxScore: 10, weight: 25 },
          { key: 'LEXICAL_RESOURCE', name: 'Lexical Resource', maxScore: 10, weight: 25 },
          { key: 'GRAMMAR_ACCURACY', name: 'Grammatical Accuracy', maxScore: 10, weight: 25 },
        ],
      }),
      teacherId,
    ]);
    const writingId = writingRes.rows[0].id;

    // 2. Tạo đề Speaking
    const speakingRes = await client.query(`
      INSERT INTO assignments (
        title, type, instructions, rubric, created_by
      ) VALUES (
        $1, 'SPEAKING', $2, $3, $4
      ) RETURNING id;
    `, [
      'TOEIC Speaking Part 1: Read a Text Aloud (Airport Announcement)',
      'Read the airport announcement clearly with proper intonation, stress and pauses.',
      JSON.stringify({
        prepTimeSeconds: 45,
        responseTimeSeconds: 45,
        audioSampleUrl: 'https://cdn.toeic.edu.vn/samples/speaking_part1_announcement.mp3',
        criteria: [
          { key: 'PRONUNCIATION', name: 'Pronunciation', maxScore: 10, weight: 40 },
          { key: 'INTONATION_STRESS', name: 'Intonation & Stress', maxScore: 10, weight: 30 },
          { key: 'FLUENCY', name: 'Fluency', maxScore: 10, weight: 30 },
        ],
      }),
      teacherId,
    ]);
    const speakingId = speakingRes.rows[0].id;

    // 3. Giao bài (Assignment Targets) cho lớp
    const target1 = await client.query(`
      INSERT INTO assignment_targets (assignment_id, class_id, student_id, due_date)
      VALUES ($1, $2, $3, NOW() + INTERVAL '7 days') RETURNING id;
    `, [writingId, classId, studentId]);

    const target2 = await client.query(`
      INSERT INTO assignment_targets (assignment_id, class_id, student_id, due_date)
      VALUES ($1, $2, $3, NOW() + INTERVAL '7 days') RETURNING id;
    `, [speakingId, classId, studentId]);

    // 4. Tạo bài nộp mẫu (Writing Submission)
    await client.query(`
      INSERT INTO assignment_submissions (
        assignment_id, target_id, student_id, class_id, submission_text, status, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'SUBMITTED', NOW() - INTERVAL '3 hours'
      );
    `, [
      writingId,
      target1.rows[0].id,
      studentId,
      classId,
      'In modern society, remote working has emerged as an increasingly viable employment model. Firstly, allowing employees to work from home two days a week reduces commuting stress significantly. Consequently, workers can save valuable time and achieve a better work-life balance. In addition, organizations can reduce overhead expenses related to office utilities...',
    ]);

    console.log('✅ Đã tạo đề Writing, đề Speaking và bài nộp mẫu thành công!');
    console.log(`- Đề Writing: ID ${writingId}`);
    console.log(`- Đề Speaking: ID ${speakingId}`);
  } catch (err) {
    console.error('❌ Lỗi seed assignments:', err);
  } finally {
    await client.end();
  }
}

seedAssignments();

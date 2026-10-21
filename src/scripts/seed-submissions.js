const { Client } = require('pg');

async function seedSubmissions() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'rl_admin',
    password: 'admin',
    database: 'toeic_db',
  });

  await client.connect();

  try {
    const student1Id = '4503a395-5212-433d-a7d1-0fd22b61d039';
    const student2Id = '0384050a-9720-445a-96b6-236f4910372a';
    const class1Id = 'da3df7b6-dd51-4228-93e4-4a104c5a8329';
    const class2Id = '8414b31e-ecd6-4c24-99e1-731c90aac4a6';
    const writingAssignmentId = 'c692f7a4-c183-47cf-b229-9987634cf89e';
    const speakingAssignmentId = 'caeef0d5-7a7e-4744-8858-5fb0b07cfef0';

    // 1. Writing submission submitted 72h ago (Overdue 48h!)
    const date72hAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const sub1 = await client.query(`
      INSERT INTO assignment_submissions (
        assignment_id, student_id, class_id, submission_text, status, submitted_at
      ) VALUES ($1, $2, $3, $4, 'SUBMITTED', $5)
      RETURNING id;
    `, [
      writingAssignmentId,
      student1Id,
      class1Id,
      'In modern society, remote working has emerged as an increasingly viable employment model. Firstly, allowing employees to work from home two days a week reduces commuting stress significantly. Consequently, workers can save valuable time and achieve a better work-life balance...',
      date72hAgo,
    ]);

    // 2. Speaking submission submitted 2h ago (Not overdue)
    const date2hAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const sub2 = await client.query(`
      INSERT INTO assignment_submissions (
        assignment_id, student_id, class_id, audio_file_url, duration_seconds, status, submitted_at
      ) VALUES ($1, $2, $3, $4, 42, 'SUBMITTED', $5)
      RETURNING id;
    `, [
      speakingAssignmentId,
      student2Id,
      class1Id,
      'speaking-submissions/student2/part1_recording.mp3',
      date2hAgo,
    ]);

    // 3. Graded submission submitted 5 days ago (GRADED, so isOverdue48h is false)
    const date5DaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const sub3 = await client.query(`
      INSERT INTO assignment_submissions (
        assignment_id, student_id, class_id, submission_text, status, submitted_at
      ) VALUES ($1, $2, $3, $4, 'GRADED', $5)
      RETURNING id;
    `, [
      writingAssignmentId,
      student1Id,
      class2Id,
      'Technology plays an indispensable role in contemporary education. Digital learning platforms offer students flexible schedules...',
      date5DaysAgo,
    ]);

    console.log('✅ Seeded submissions successfully:');
    console.log(`- Sub 1 (Writing, 72h ago, Overdue): ${sub1.rows[0].id}`);
    console.log(`- Sub 2 (Speaking, 2h ago, Pending): ${sub2.rows[0].id}`);
    console.log(`- Sub 3 (Writing, 5d ago, Graded): ${sub3.rows[0].id}`);
  } catch (err) {
    console.error('❌ Failed to seed submissions:', err);
  } finally {
    await client.end();
  }
}

seedSubmissions();

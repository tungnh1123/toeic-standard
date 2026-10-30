const { Client } = require('pg');

async function seedClasses() {
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
    
    if (teacherRes.rows.length === 0 || studentRes.rows.length === 0) {
      console.log('⚠️ Cần có tài khoản TEACHER và STUDENT trước khi seed lớp.');
      return;
    }

    const teacherId = teacherRes.rows[0].id;
    const studentId = studentRes.rows[0].id;

    // Seed 2 classes
    const class1Res = await client.query(`
      INSERT INTO classes (code, name, teacher_id, academic_year, is_active)
      VALUES ('TOEIC-750-K24', 'Lớp TOEIC Chuyên Sâu 750+ Khóa 24', $1, '2026-2027', true)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code, name;
    `, [teacherId]);

    const class2Res = await client.query(`
      INSERT INTO classes (code, name, teacher_id, academic_year, is_active)
      VALUES ('TOEIC-SW-PRO', 'Lớp Luyện Kỹ Năng Speaking & Writing Nâng Cao', $1, '2026-2027', true)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code, name;
    `, [teacherId]);

    const class1 = class1Res.rows[0];
    const class2 = class2Res.rows[0];

    // Enroll student
    await client.query(`
      INSERT INTO class_enrollments (class_id, student_id)
      VALUES ($1, $2), ($3, $2)
      ON CONFLICT (class_id, student_id) DO NOTHING;
    `, [class1.id, studentId, class2.id]);

    console.log('✅ Seeded classes and enrollments successfully:');
    console.log(`- ${class1.name} (${class1.code}) [ID: ${class1.id}]`);
    console.log(`- ${class2.name} (${class2.code}) [ID: ${class2.id}]`);
  } catch (err) {
    console.error('❌ Failed to seed classes:', err);
  } finally {
    await client.end();
  }
}

seedClasses();

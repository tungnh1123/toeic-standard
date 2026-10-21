const { Client } = require('pg');

async function seedClasses() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'rl_admin',
    password: 'admin',
    database: 'toeic_db',
  });

  await client.connect();

  try {
    const teacherId = 'dd3ed0a4-6a85-4284-8e9b-88c9ae3c4eb8';
    const student1Id = '4503a395-5212-433d-a7d1-0fd22b61d039';
    const student2Id = '0384050a-9720-445a-96b6-236f4910372a';

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

    // Enroll students
    await client.query(`
      INSERT INTO class_enrollments (class_id, student_id)
      VALUES ($1, $2), ($1, $3), ($4, $2)
      ON CONFLICT (class_id, student_id) DO NOTHING;
    `, [class1.id, student1Id, student2Id, class2.id]);

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

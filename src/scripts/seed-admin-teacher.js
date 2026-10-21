const { Client } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

async function seedAdminAndTeacher() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'rl_admin',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'toeic_db',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const teacherPasswordHash = await bcrypt.hash('Teacher123!', 10);

    // Upsert Admin
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('admin@toeic.edu.vn', '${adminPasswordHash}', 'Quản Trị Viên Hệ Thống', 'ADMIN')
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = 'ADMIN',
          full_name = EXCLUDED.full_name;
    `);
    console.log('✅ Admin account seeded: admin@toeic.edu.vn / Admin123!');

    // Upsert Teacher
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('teacher@toeic.edu.vn', '${teacherPasswordHash}', 'Giảng Viên Nguyễn Văn A', 'TEACHER')
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = 'TEACHER',
          full_name = EXCLUDED.full_name;
    `);
    console.log('✅ Teacher account seeded: teacher@toeic.edu.vn / Teacher123!');
  } catch (error) {
    console.error('❌ Failed to seed accounts:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedAdminAndTeacher();

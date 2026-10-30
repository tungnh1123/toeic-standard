const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Vui lòng cung cấp DATABASE_URL.');
    console.log('Ví dụ: DATABASE_URL="postgresql://..." node src/scripts/setup-database.js');
    process.exit(1);
  }

  console.log('🔄 Đang kết nối tới Database PostgreSQL...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Kết nối thành công!');

  try {
    // 1. Đọc và thực thi DDL Schema v12.0
    const ddlPath = path.join(__dirname, '../../docs/system-specs/02_postgresql-16-ddl-schema-v12.md');
    const content = fs.readFileSync(ddlPath, 'utf8');

    // Tách các khối sql trong markdown
    const sqlMatches = content.match(/```sql([\s\S]*?)```/g);
    if (!sqlMatches || sqlMatches.length === 0) {
      throw new Error('Không tìm thấy khối SQL trong file DDL');
    }

    console.log('🔄 Đang khởi tạo 35 bảng CSDL PostgreSQL 16 (v12.0)...');
    for (const match of sqlMatches) {
      const sql = match.replace(/```sql/, '').replace(/```/, '').trim();
      if (sql) {
        await client.query(sql);
      }
    }
    console.log('✅ Đã tạo đầy đủ 35 bảng CSDL và Enums thành công!');

    // 2. Khởi tạo tài khoản mẫu
    console.log('🔄 Đang khởi tạo tài khoản Admin, Giảng viên và Học viên...');
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const teacherPasswordHash = await bcrypt.hash('Teacher123!', 10);
    const studentPasswordHash = await bcrypt.hash('Password123!', 10);

    const adminQuery = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('admin@toeic.edu.vn', '${adminPasswordHash}', 'Quản Trị Viên Hệ Thống', 'ADMIN')
      ON CONFLICT (email) DO NOTHING;
    `;
    const teacherQuery = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('teacher@toeic.edu.vn', '${teacherPasswordHash}', 'Giảng Viên Nguyễn Văn A', 'TEACHER')
      ON CONFLICT (email) DO NOTHING;
    `;
    const studentQuery = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('test.student@example.com', '${studentPasswordHash}', 'Nguyễn Văn Test', 'STUDENT')
      ON CONFLICT (email) DO NOTHING;
    `;

    await client.query(adminQuery);
    await client.query(teacherQuery);
    await client.query(studentQuery);
    console.log('✅ Tài khoản đã tạo sẵn sàng:');
    console.log('   👑 ADMIN:   admin@toeic.edu.vn / Admin123!');
    console.log('   🎓 TEACHER: teacher@toeic.edu.vn / Teacher123!');
    console.log('   ✏️ STUDENT: test.student@example.com / Password123!');

    console.log('\n🎉 TOÀN BỘ CƠ SỞ DỮ LIỆU ĐÃ ĐƯỢC THIẾT LẬP HOÀN TẤT!');
  } catch (err) {
    console.error('❌ Lỗi thiết lập Database:', err.message);
  } finally {
    await client.end();
  }
}

run();


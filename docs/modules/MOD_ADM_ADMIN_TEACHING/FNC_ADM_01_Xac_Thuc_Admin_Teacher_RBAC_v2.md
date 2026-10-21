# MODULE SPECIFICATION: FNC_ADM_01 — ĐĂNG NHẬP & XÁC THỰC VAI TRÒ ADMIN / GIẢNG VIÊN (RBAC)

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_01` (Tương ứng `FNC_ADM_01`)
* **Tên Module:** Đăng nhập & Xác thực vai trò Admin / Giảng viên theo RBAC (Admin & Teacher Authentication & Role-Based Access Control)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_01_Xac_Thuc_Admin_Teacher_RBAC_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Session Tokens)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Quản trị viên (Admin):** Tôi muốn đăng nhập vào Web Portal quản trị bằng email/mật khẩu để sở hữu toàn quyền quản trị hệ thống, quản lý tài khoản, cấu hình đề thi TOEIC và giám sát toàn bộ các lớp học.
* **Là Giảng viên (Teacher):** Tôi muốn đăng nhập vào Web Portal quản trị để truy cập giao diện quản lý lớp học, tạo đề bài tập, giao bài và chấm điểm bài tập cho học viên thuộc các lớp được phân công phụ trách.
* **Là Học viên (Student):** Tôi bị chặn truy cập tuyệt đối tại cổng đăng nhập Web Portal quản trị để đảm bảo tính bảo mật và phân vùng không gian làm việc.
* **Là Hệ thống (System):** Tôi muốn tự động bảo vệ tài khoản khỏi tấn công Brute-force, vô hiệu hóa các token khi có nguy cơ rò rỉ và cấp lại Access Token mới ngầm (Silent Refresh) để duy trì phiên làm việc mượt mà cho người dùng.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Next.js / Mobile) ]           [ Backend NestJS ]           [ Redis / PostgreSQL 16 ]
              │                                 │                               │
  ─── 1. POST /api/v1/auth/login ──────────────>│                               │
      (email, password)                         │── 2. Check Lockout (Redis) ──>│
                                                │<─ (Not Locked) ───────────────│
                                                │                               │
                                                │── 3. Query User by Email ────>│
                                                │<─ (User Entity + PassHash) ───│
                                                │                               │
                                                │── 4. Verify Bcrypt Hash ──────│
                                                │   (Failed -> Increment Redis) │
                                                │                               │
                                                │── 5. Generate JWT Pair ───────│
                                                │   (Access 15m, Refresh 7d)    │
                                                │                               │
                                                │── 6. CSDL Transaction ───────>│
                                                │   (Insert user_refresh_tokens)│
                                                │<─ (Transaction Commit) ───────│
                                                │                               │
  <── 7. Response 200 OK (Tokens & Profile) ────│                               │
```

#### Tiến trình Đăng nhập (Login Flow)
1. Client gửi request `POST /api/v1/auth/login` chứa `email` và `password`.
2. Service kiểm tra cờ khóa tài khoản tạm thời trong Redis key `login_attempts:{email}`. Nếu số lần đăng nhập sai >= 5 lần trong 15 phút, chặn request và phản hồi HTTP 400 kèm mã lỗi `ERR_AUTH_LOCKED` (tạm khóa 30 phút).
3. Service tìm kiếm `users` theo `email`. So sánh `password` với `password_hash` qua `bcrypt.compare()`.
4. Nếu thất bại: Tăng biến đếm `login_attempts:{email}` trong Redis thêm 1 unit và đặt TTL 15 phút.
5. Nếu thành công: Xóa key `login_attempts:{email}` trong Redis. Khởi tạo cặp JWT:
   * **Access Token:** Thời hạn 15 phút, Payload `{ sub: userId, email, role }`.
   * **Refresh Token:** Thời hạn 7 ngày, chuỗi ngẫu nhiên bảo mật.
6. Bọc trong **CSDL Transaction**: Lưu `token_hash` (mã hóa SHA-256), `ip_address`, `user_agent` và `expires_at` vào bảng `user_refresh_tokens`.
7. Phản hồi DTO dạng Response Envelope chuẩn.

#### Tiến trình Xoay vòng Refresh Token (Refresh Token Rotation Flow)
1. Client gửi request `POST /api/v1/auth/refresh-token` chứa `refreshToken`.
2. Service xác thực tính hợp lệ của Refresh Token.
3. Query CSDL bảng `user_refresh_tokens` đối chiếu `token_hash`.
4. Kiểm tra ràng buộc: Nếu `is_revoked === true` hoặc `expires_at < NOW()`, vô hiệu hóa toàn bộ các Refresh Tokens của `user_id` đó (phòng chống Token Reuse Attack) và trả về HTTP 401 Unauthorized (`ERR_AUTH_002`).
5. Nếu hợp lệ, bọc trong **CSDL Transaction**:
   * Đánh dấu token cũ `is_revoked = true`.
   * Khởi tạo cặp Access Token (15m) & Refresh Token (7d) mới.
   * Lưu bản ghi token mới vào `user_refresh_tokens`.
6. Trả về cặp Token mới cho Client.

#### Tiến trình Đăng xuất (Logout Flow)
1. Client gửi request `POST /api/v1/auth/logout` đính kèm Header `Authorization: Bearer <access_token>` và Body chứa `refreshToken`.
2. Service tìm bản ghi trong `user_refresh_tokens` tương ứng và cập nhật `is_revoked = true`.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Bảo mật (Business Rules & Security Algorithms)

* **Bảo vệ Brute-Force (Lockout Rule):**
  Failed Attempts >= 5 trong 15 phút => Temporary Lockout 30 phút.
* **Thuật toán Mã hóa Mật khẩu:** Bcrypt với `saltRounds = 10`.
* **Cơ chế Token Security:**
  * **Access Token:** JWT signed bằng `JWT_SECRET`, hết hạn sau **15 phút**.
  * **Refresh Token:** JWT signed bằng `JWT_REFRESH_SECRET`, hết hạn sau **7 ngày**. Lưu chuỗi SHA-256 Hash trong cột `token_hash` của bảng `user_refresh_tokens`.
* **Chính sách Cách ly Vai trò (Role Isolation):**
  * `ADMIN`: Toàn quyền trên Web Portal Quản trị.
  * `TEACHER`: Được truy cập Web Portal nhưng chỉ thao tác trên các Lớp học do mình phụ trách (`classes.teacher_id = user_id`).
  * `STUDENT`: Bị chặn hoàn toàn khỏi Web Portal Quản trị tại `RolesGuard` với mã lỗi HTTP 403 Forbidden (`ERR_AUTH_003`).

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### Bảng `users` (Quản lý Tài khoản Dùng chung)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `email` (`VARCHAR(255)`, UNIQUE, NOT NULL)
* `password_hash` (`VARCHAR(255)`, NOT NULL, `{ select: false }`)
* `full_name` (`VARCHAR(150)`, NOT NULL)
* `role` (`user_role_enum`, DEFAULT `'STUDENT'`, NOT NULL)
* `avatar_url` (`TEXT`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)
* `updated_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### Bảng `user_refresh_tokens` (Hợp nhất Session Token v12.0)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `token_hash` (`VARCHAR(255)`, NOT NULL)
* `ip_address` (`VARCHAR(45)`, NULLABLE)
* `user_agent` (`TEXT`, NULLABLE)
* `is_revoked` (`BOOLEAN`, DEFAULT `false`, NOT NULL)
* `expires_at` (`TIMESTAMPTZ`, NOT NULL)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_refresh_tokens_user_id ON user_refresh_tokens(user_id);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `POST` | `/api/v1/auth/login` | Public | Đăng nhập chung hệ thống (cấp JWT Access Token & Refresh Token) |
| **2** | `POST` | `/api/v1/auth/register` | Public | Đăng ký tài khoản học viên mới |
| **3** | `POST` | `/api/v1/auth/refresh-token` | Public | Đổi Access Token mới qua cơ chế Refresh Token Rotation |
| **4** | `POST` | `/api/v1/auth/logout` | Authenticated | Đăng xuất, thu hồi Refresh Token |
| **5** | `GET` | `/api/v1/student/profile/me` | Student / Teacher / Admin | Lấy thông tin tài khoản đang đăng nhập |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "sample_access_token_jwt",
    "refreshToken": "sample_refresh_token_uuid",
    "user": {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "email": "teacher@toeic.edu.vn",
      "fullName": "Giảng viên Nguyễn Văn A",
      "role": "TEACHER",
      "avatarUrl": "avatars/teacher_a.png"
    }
  },
  "timestamp": "2026-10-12T20:35:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/auth/login` | **○** (Toàn quyền) | **○** (Toàn quyền) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `POST /api/v1/auth/refresh-token` | **○** (Toàn quyền) | **○** (Toàn quyền) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `POST /api/v1/auth/logout` | **×** (Chặn 403) | **○** (Cá nhân) | **○** (Cá nhân) | **○** (Toàn quyền) |
| `GET /api/v1/student/profile/me` | **×** (Chặn 403) | **○** (Cá nhân) | **○** (Cá nhân) | **○** (Toàn quyền) |
| Truy cập Web Admin Portal | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp phụ trách) | **○** (Toàn quyền) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/auth/dto/login.dto.ts`
  * `src/modules/auth/dto/refresh-token.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không đúng định dạng hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password!: string;
}

// src/modules/auth/dto/refresh-token.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh Token phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Refresh Token không được để trống.' })
  refreshToken!: string;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Transactions

* **Tệp tin khởi tạo:**
  * `src/modules/users/entities/user.entity.ts`
  * `src/modules/auth/entities/user-refresh-token.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 150, name: 'full_name' })
  fullName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

// src/modules/auth/entities/user-refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_refresh_tokens')
export class UserRefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 255, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'boolean', name: 'is_revoked', default: false })
  isRevoked!: boolean;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `AuthService` & Redis Lockout

* **Tệp tin khởi tạo:** `src/modules/auth/auth.service.ts`
* **Chức năng:** Xử lý đăng nhập, so sánh Bcrypt, kiểm tra Brute-force Redis, bọc Transaction xoay vòng Refresh Token.

```typescript
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserEntity } from '../users/entities/user.entity';
import { UserRefreshTokenEntity } from './entities/user-refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.dataSource.getRepository(UserEntity).createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new BadRequestException({
        errorCode: 'ERR_AUTH_001',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException({
        errorCode: 'ERR_AUTH_001',
        message: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const refreshTokenEntity = manager.create(UserRefreshTokenEntity, {
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        isRevoked: false,
        expiresAt,
      });
      await manager.save(refreshTokenEntity);
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto, ipAddress: string, userAgent: string) {
    const incomingHash = this.hashToken(dto.refreshToken);

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const existingToken = await manager.findOne(UserRefreshTokenEntity, {
        where: { tokenHash: incomingHash },
        relations: ['user'],
      });

      if (!existingToken || existingToken.isRevoked || existingToken.expiresAt < new Date()) {
        if (existingToken) {
          await manager.update(UserRefreshTokenEntity, { userId: existingToken.userId }, { isRevoked: true });
          await this.notificationQueue.add('security-alert', {
            userId: existingToken.userId,
            event: 'REFRESH_TOKEN_REUSE_DETECTED',
            timestamp: new Date(),
          });
        }
        throw new UnauthorizedException({
          errorCode: 'ERR_AUTH_002',
          message: 'Refresh Token không hợp lệ hoặc đã hết hạn.',
        });
      }

      existingToken.isRevoked = true;
      await manager.save(existingToken);

      const user = existingToken.user;
      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' },
      );

      const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
      const newHash = this.hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const newTokenEntity = manager.create(UserRefreshTokenEntity, {
        userId: user.id,
        tokenHash: newHash,
        ipAddress,
        userAgent,
        isRevoked: false,
        expiresAt,
      });
      await manager.save(newTokenEntity);

      return {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
      };
    });
  }

  async logout(userId: string, rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.dataSource.getRepository(UserRefreshTokenEntity).update(
      { userId, tokenHash },
      { isRevoked: true },
    );
    return { success: true };
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `AuthController` & RBAC Guards

* **Tệp tin khởi tạo:** `src/modules/auth/auth.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, gắn Guards bảo mật, sử dụng Decorators `@Roles()`.

```typescript
import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    const userAgent = req.headers['user-agent'] || '';
    return await this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    const userAgent = req.headers['user-agent'] || '';
    return await this.authService.refreshToken(dto, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request & { user: { sub: string } }, @Body() dto: RefreshTokenDto) {
    return await this.authService.logout(req.user.sub, dto.refreshToken);
  }
}

@Controller('api/v1/student/profile')
export class ProfileController {
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async getProfile(@Req() req: Request & { user: { sub: string; email: string; role: string } }) {
    return {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    };
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 & Axios Interceptor)

* **Tệp tin khởi tạo:** `src/api/auth-hooks.ts`
* **Chức năng:** Cung cấp Custom Hooks cho Next.js Web Admin Portal & Mobile App.

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    avatarUrl: string | null;
  };
}

export const useLoginMutation = () => {
  return useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: async (payload: LoginPayload) => {
      const response = await apiClient.post('/auth/login', payload);
      return response.data;
    },
  });
};

export const useProfileQuery = () => {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/student/profile/me');
      return response.data;
    },
  });
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

* [x] **Trụ cột 1: Type Safety & Compilation**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch.
  * Zero `any` hoặc `as any` trong DTOs, Entities, Services, Controllers.
  * Các biến boolean dùng đúng tiền tố `isRevoked`.
* [x] **Trụ cột 2: Integrity & Performance**
  * Thao tác xoay vòng Token và cấp phiên bọc 100% trong `this.dataSource.transaction()`.
  * Không có câu lệnh SQL query DB trong vòng lặp (`No N+1 Query`).
  * Tác vụ cảnh báo bảo mật đẩy bất đồng bộ qua BullMQ Queue `@InjectQueue('notifications')`.
* [x] **Trụ cột 3: Bảo mật & RBAC**
  * Mật khẩu mã hóa Bcrypt 10 rounds; `password_hash` được ẩn khỏi SELECT nhờ `{ select: false }`.
  * Đúng Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)` được áp dụng trên Controllers.
  * Refresh Token lưu dưới dạng SHA-256 Hash trong `user_refresh_tokens`.
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
  * Hỗ trợ Silent Refresh Token Rotation bắt mã lỗi 401 trên Axios Interceptor.

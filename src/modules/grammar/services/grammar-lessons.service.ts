import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { GrammarCategoryEntity } from '../entities/grammar-category.entity';
import { GrammarLessonEntity } from '../entities/grammar-lesson.entity';
import { UserGrammarProgressEntity } from '../entities/user-grammar-progress.entity';
import { UserGrammarBookmarkEntity } from '../entities/user-grammar-bookmark.entity';
import { UserStreakEntity } from '../../analytics/entities/user-streak.entity';
import { UpdateReadingProgressDto } from '../dto/update-reading-progress.dto';
import {
  GrammarLessonDetailResponseDto,
  TableOfContentItemDto,
} from '../dto/grammar-lesson-detail.dto';
import { GrammarCategoryResponseDto } from '../dto/grammar-category-response.dto';
import { GrammarLessonItemDto } from '../dto/grammar-lesson-item.dto';
import { CefrLevel } from '../../flashcards/entities/flashcard-deck.entity';

interface CategoryRow {
  id: string;
  title: string;
  description: string | null;
  targetLevel: CefrLevel;
  iconName: string;
  colorCode: string;
  orderIndex: number;
  totalLessons: string | number;
  completedLessons: string | number;
}

interface LessonRow {
  id: string;
  categoryId: string;
  categoryTitle?: string;
  title: string;
  slug: string;
  summary: string;
  estimatedReadTimeMinutes: number;
  orderIndex: number;
  isCompleted: boolean;
  scrollPercentage: number;
  isBookmarked: boolean;
  lastReadAt?: string | null;
}

interface CountRow {
  count: string | number;
}

@Injectable()
export class GrammarLessonsService implements OnModuleInit {
  private readonly logger = new Logger(GrammarLessonsService.name);

  constructor(
    @InjectRepository(GrammarCategoryEntity)
    private readonly categoryRepo: Repository<GrammarCategoryEntity>,
    @InjectRepository(GrammarLessonEntity)
    private readonly lessonRepo: Repository<GrammarLessonEntity>,
    @InjectRepository(UserGrammarProgressEntity)
    private readonly progressRepo: Repository<UserGrammarProgressEntity>,
    @InjectRepository(UserGrammarBookmarkEntity)
    private readonly bookmarkRepo: Repository<UserGrammarBookmarkEntity>,
    private readonly dataSource: DataSource,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.seedInitialGrammarData();
  }

  /**
   * Endpoint #25: Lấy danh mục các chuyên đề ngữ pháp kèm % tiến độ của học viên
   */
  public async getCategoriesWithProgress(
    userId: string | null,
  ): Promise<GrammarCategoryResponseDto[]> {
    const safeUserId = userId || '00000000-0000-0000-0000-000000000000';

    const categories: CategoryRow[] = await this.dataSource.query(
      `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.target_level AS "targetLevel",
        c.icon_name AS "iconName",
        c.color_code AS "colorCode",
        c.order_index AS "orderIndex",
        COUNT(l.id)::int AS "totalLessons",
        COUNT(CASE WHEN p.is_completed = true THEN 1 END)::int AS "completedLessons"
      FROM grammar_categories c
      LEFT JOIN grammar_lessons l ON l.category_id = c.id AND l.is_published = true
      LEFT JOIN user_grammar_progress p ON p.lesson_id = l.id AND p.user_id = $1
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.order_index ASC
      `,
      [safeUserId],
    );

    return categories.map((cat) => {
      const total = Number(cat.totalLessons);
      const completed = Number(cat.completedLessons);
      return {
        id: cat.id,
        title: cat.title,
        description: cat.description,
        targetLevel: cat.targetLevel,
        iconName: cat.iconName,
        colorCode: cat.colorCode,
        orderIndex: cat.orderIndex,
        totalLessons: total,
        completedLessons: completed,
        progressPercentage:
          total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  /**
   * Endpoint #26: Lấy danh sách bài học thuộc chuyên đề (kèm trạng thái đã học / chưa học)
   */
  public async getLessonsByCategory(
    userId: string | null,
    categoryId: string,
  ): Promise<GrammarLessonItemDto[]> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Chuyên đề ngữ pháp không tồn tại hoặc đã bị ẩn.',
      });
    }

    const safeUserId = userId || '00000000-0000-0000-0000-000000000000';

    const rawLessons: LessonRow[] = await this.dataSource.query(
      `
      SELECT 
        l.id,
        l.category_id AS "categoryId",
        c.title AS "categoryTitle",
        l.title,
        l.slug,
        l.summary,
        l.estimated_read_time_minutes AS "estimatedReadTimeMinutes",
        l.order_index AS "orderIndex",
        COALESCE(p.is_completed, false) AS "isCompleted",
        COALESCE(p.scroll_percentage, 0) AS "scrollPercentage",
        CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS "isBookmarked",
        p.last_read_at AS "lastReadAt"
      FROM grammar_lessons l
      JOIN grammar_categories c ON c.id = l.category_id
      LEFT JOIN user_grammar_progress p ON p.lesson_id = l.id AND p.user_id = $1
      LEFT JOIN user_grammar_bookmarks b ON b.lesson_id = l.id AND b.user_id = $1
      WHERE l.category_id = $2 AND l.is_published = true
      ORDER BY l.order_index ASC
      `,
      [safeUserId, categoryId],
    );

    return rawLessons.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryTitle: item.categoryTitle,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      estimatedReadTimeMinutes: item.estimatedReadTimeMinutes,
      orderIndex: item.orderIndex,
      isCompleted: item.isCompleted,
      scrollPercentage: item.scrollPercentage,
      isBookmarked: item.isBookmarked,
      lastReadAt: item.lastReadAt ?? null,
    }));
  }

  /**
   * Endpoint #27: Lấy nội dung chi tiết bài giảng Markdown, mục lục TOC, bài trước/sau
   */
  public async getLessonDetail(
    userId: string | null,
    lessonId: string,
  ): Promise<GrammarLessonDetailResponseDto> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, isPublished: true },
      relations: ['category'],
    });

    if (!lesson) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học ngữ pháp không tồn tại hoặc chưa được xuất bản.',
      });
    }

    const safeUserId = userId || '00000000-0000-0000-0000-000000000000';

    // 1. Trích xuất mục lục động (Table of Contents) từ Markdown Headings
    const tableOfContents = this.extractTOCFromMarkdown(lesson.contentMarkdown);

    // 2. Tìm bài học trước và bài học sau theo thứ tự
    const siblingLessons = await this.lessonRepo.find({
      where: { categoryId: lesson.categoryId, isPublished: true },
      select: ['id', 'orderIndex'],
      order: { orderIndex: 'ASC' },
    });

    const currentIndex = siblingLessons.findIndex((l) => l.id === lessonId);
    const previousLessonId =
      currentIndex > 0 ? siblingLessons[currentIndex - 1].id : null;
    const nextLessonId =
      currentIndex >= 0 && currentIndex < siblingLessons.length - 1
        ? siblingLessons[currentIndex + 1].id
        : null;

    // 3. Lấy tiến độ đọc, trạng thái bookmark, và số câu hỏi quiz nếu có
    const [progress, bookmark, quizCountRaw] = await Promise.all([
      this.progressRepo.findOne({ where: { userId: safeUserId, lessonId } }),
      this.bookmarkRepo.findOne({ where: { userId: safeUserId, lessonId } }),
      this.dataSource
        .query<CountRow[]>(
          `SELECT COUNT(id)::int as count FROM grammar_quiz_questions WHERE lesson_id = $1`,
          [lessonId],
        )
        .catch(() => [{ count: 0 }]),
    ]);

    const quizCount = Number(quizCountRaw[0]?.count || 0);

    return {
      id: lesson.id,
      categoryId: lesson.categoryId,
      categoryTitle: lesson.category?.title || '',
      title: lesson.title,
      slug: lesson.slug,
      summary: lesson.summary,
      contentMarkdown: lesson.contentMarkdown,
      estimatedReadTimeMinutes: lesson.estimatedReadTimeMinutes,
      tableOfContents,
      previousLessonId,
      nextLessonId,
      isCompleted: progress?.isCompleted ?? false,
      scrollPercentage: progress?.scrollPercentage ?? 0,
      isBookmarked: Boolean(bookmark),
      hasQuiz: quizCount > 0,
      quizCount,
    };
  }

  /**
   * Endpoint #28: Cập nhật % cuộn trang đọc và đánh dấu hoàn thành bài học
   */
  public async updateProgress(
    userId: string,
    lessonId: string,
    dto: UpdateReadingProgressDto,
  ): Promise<{ isCompleted: boolean; scrollPercentage: number }> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, isPublished: true },
    });
    if (!lesson) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học không tồn tại.',
      });
    }

    return await this.dataSource.transaction(
      async (manager: EntityManager) => {
        let progress = await manager.findOne(UserGrammarProgressEntity, {
          where: { userId, lessonId },
        });

        if (!progress) {
          progress = manager.create(UserGrammarProgressEntity, {
            userId,
            lessonId,
            scrollPercentage: 0,
            isCompleted: false,
          });
        }

        // Đánh dấu hoàn thành nếu cuộn >= 80% hoặc bấm xác nhận "Đã hiểu bài"
        const shouldComplete =
          progress.isCompleted ||
          dto.markAsCompleted === true ||
          dto.scrollPercentage >= 80;

        if (!progress.isCompleted && shouldComplete) {
          progress.isCompleted = true;
          progress.completedAt = new Date();

          // Kích hoạt cập nhật chuỗi chuyên cần học tập (Streak)
          await this.touchUserStreak(manager, userId);
        }

        progress.scrollPercentage = Math.max(
          progress.scrollPercentage,
          dto.scrollPercentage,
        );
        progress.lastReadAt = new Date();

        await manager.save(UserGrammarProgressEntity, progress);

        return {
          isCompleted: progress.isCompleted,
          scrollPercentage: progress.scrollPercentage,
        };
      },
    );
  }

  /**
   * Endpoint #29: Đánh dấu yêu thích / Bỏ đánh dấu bài giảng ngữ pháp (Toggle)
   */
  public async toggleBookmark(
    userId: string,
    lessonId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, isPublished: true },
    });
    if (!lesson) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học không tồn tại.',
      });
    }

    const existingBookmark = await this.bookmarkRepo.findOne({
      where: { userId, lessonId },
    });

    if (existingBookmark) {
      await this.bookmarkRepo.remove(existingBookmark);
      return { isBookmarked: false };
    }

    const newBookmark = this.bookmarkRepo.create({
      userId,
      lessonId,
    });
    await this.bookmarkRepo.save(newBookmark);
    return { isBookmarked: true };
  }

  /**
   * Endpoint #30: Lấy danh sách bài học ngữ pháp vừa đọc gần đây
   */
  public async getRecentLessons(
    userId: string,
    limit: number = 10,
  ): Promise<GrammarLessonItemDto[]> {
    const rawLessons: LessonRow[] = await this.dataSource.query(
      `
      SELECT 
        l.id,
        l.category_id AS "categoryId",
        c.title AS "categoryTitle",
        l.title,
        l.slug,
        l.summary,
        l.estimated_read_time_minutes AS "estimatedReadTimeMinutes",
        l.order_index AS "orderIndex",
        p.is_completed AS "isCompleted",
        p.scroll_percentage AS "scrollPercentage",
        CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS "isBookmarked",
        p.last_read_at AS "lastReadAt"
      FROM user_grammar_progress p
      JOIN grammar_lessons l ON l.id = p.lesson_id AND l.is_published = true
      JOIN grammar_categories c ON c.id = l.category_id
      LEFT JOIN user_grammar_bookmarks b ON b.lesson_id = l.id AND b.user_id = $1
      WHERE p.user_id = $1
      ORDER BY p.last_read_at DESC
      LIMIT $2
      `,
      [userId, limit],
    );

    return rawLessons.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryTitle: item.categoryTitle,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      estimatedReadTimeMinutes: item.estimatedReadTimeMinutes,
      orderIndex: item.orderIndex,
      isCompleted: item.isCompleted,
      scrollPercentage: item.scrollPercentage,
      isBookmarked: item.isBookmarked,
      lastReadAt: item.lastReadAt ?? null,
    }));
  }

  /**
   * Trích xuất Heading (#, ##, ###) từ Markdown thành cây mục lục
   */
  public extractTOCFromMarkdown(markdown: string): TableOfContentItemDto[] {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: TableOfContentItemDto[] = [];
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const rawTitle = match[2].trim();
      // Remove any trailing markdown anchors or symbols
      const cleanTitle = rawTitle.replace(/\*\*|__/g, '').trim();
      const id = cleanTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      toc.push({ id, title: cleanTitle, level });
    }

    return toc;
  }

  /**
   * Cập nhật chỉ số chuyên cần học tập (Streak) của người dùng
   */
  private async touchUserStreak(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    let streak = await manager.findOne(UserStreakEntity, { where: { userId } });

    if (!streak) {
      streak = manager.create(UserStreakEntity, {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        freezeCredits: 2,
        lastActivityDate: todayStr,
        streakStartedDate: todayStr,
      });
      await manager.save(UserStreakEntity, streak);
      return;
    }

    if (streak.lastActivityDate === todayStr) {
      return;
    }

    const prevDate = new Date(streak.lastActivityDate);
    const currDate = new Date(todayStr);
    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24),
    );

    if (diffDays === 1) {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else if (diffDays > 1) {
      streak.currentStreak = 1;
      streak.streakStartedDate = todayStr;
    }

    streak.lastActivityDate = todayStr;
    await manager.save(UserStreakEntity, streak);
  }

  /**
   * Khởi tạo dữ liệu mẫu bài giảng ngữ pháp chuẩn TOEIC nếu chưa có
   */
  private async seedInitialGrammarData(): Promise<void> {
    try {
      const count = await this.categoryRepo.count();
      if (count > 0) {
        return;
      }

      this.logger.log('Bắt đầu khởi tạo dữ liệu mẫu bài giảng ngữ pháp TOEIC...');

      // 1. Chuyên đề 1: 12 Thì căn bản & trọng điểm TOEIC
      const cat1 = this.categoryRepo.create({
        title: '12 Thì Căn Bản & Trọng Điểm TOEIC',
        description:
          'Tổng hợp công thức, dấu hiệu nhận biết, bảng so sánh và các bẫy thời thì hay gặp nhất trong đề thi TOEIC Part 5 & 6.',
        targetLevel: CefrLevel.A2,
        iconName: 'clock',
        colorCode: '#2563EB',
        orderIndex: 1,
        isActive: true,
      });
      const savedCat1 = await this.categoryRepo.save(cat1);

      // Lesson 1.1: Hiện tại hoàn thành
      const lesson1_1 = this.lessonRepo.create({
        categoryId: savedCat1.id,
        title: 'Thì Hiện Tại Hoàn Thành (Present Perfect Tense)',
        slug: 'thi-hien-tai-hoan-thanh-present-perfect-tense',
        summary:
          'Nắm vững công thức, dấu hiệu nhận biết (since, for, already, yet), bảng so sánh với Quá khứ đơn và bẫy mệnh đề sau since.',
        estimatedReadTimeMinutes: 8,
        orderIndex: 1,
        isPublished: true,
        contentMarkdown: `# THÌ HIỆN TẠI HOÀN THÀNH (PRESENT PERFECT TENSE)

## 1. Cấu trúc ngữ pháp trọng tâm

> [!FORMULA]
> **Khẳng định (+):** \`S + have / has + V3/ed + (O)\`  
> **Phủ định (-):** \`S + have / has + not + V3/ed + (O)\` (haven't / hasn't)  
> **Nghi vấn (?):** \`Have / Has + S + V3/ed + (O)?\`  
> *Quy tắc:* Chủ ngữ số ít \`He / She / It / Danh từ số ít\` đi với **has**; \`I / You / We / They / Danh từ số nhiều\` đi với **have**.

### Ví dụ ngữ cảnh trong công sở (Workplace Context):
- *Ms. Anderson has worked as the Marketing Director for over five years.* (Bà Anderson đã làm Giám đốc Tiếp thị hơn 5 năm - hiện tại vẫn đang làm).
- *We have already dispatched the replacement components to your warehouse.* (Chúng tôi đã gửi các linh kiện thay thế đến kho của bạn rồi).

---

## 2. Dấu hiệu nhận biết trong đề thi TOEIC

> [!TIP]
> Gặp các trạng từ và liên từ sau trong bài thi Part 5, hãy ưu tiên chọn thì Hiện tại hoàn thành:
> - **Since** (+ mốc thời gian trong quá khứ / mệnh đề quá khứ đơn): *since 2020, since yesterday, since he joined the company*.
> - **For** (+ khoảng thời gian): *for 3 weeks, for a decade, for several months*.
> - **Chỉ sự hoàn tất hoặc chưa xong:** *already, yet (thường đứng cuối câu phủ định/nghi vấn), just, recently, lately*.
> - **Chỉ sự trải nghiệm:** *ever, never, so far, up to now, until now, up to the present*.

---

## 3. Bẫy đề thi TOEIC kinh điển cần tránh (Exam Trap)

> [!WARNING]
> **Bẫy 1: Sự hòa hợp thì với liên từ "SINCE" trong câu phức**  
> Trong câu phức chứa liên từ *since*:
> - Mệnh đề đi liền ngay sau \`since\` **bắt buộc phải chia ở thì Quá khứ đơn (Past Simple - V2/ed)**.
> - Mệnh đề chính còn lại chia ở thì **Hiện tại hoàn thành (Present Perfect - have/has + V3/ed)**.  
> ❌ *Sai:* Mr. Tanaka has expanded the business since he has received the investment.  
> ✅ *Đúng:* Mr. Tanaka **has expanded** the business since he **received** the investment.

> [!WARNING]
> **Bẫy 2: Nhầm lẫn giữa "for" và "during"**  
> - \`for + khoảng thời gian (số đếm)\`: *for two weeks, for five days*.  
> - \`during + danh từ chỉ một thời kỳ / sự kiện\`: *during the conference, during the winter break*. (Cấm dùng *during 5 days*).

---

## 4. Bảng so sánh trực quan: Hiện tại hoàn thành vs. Quá khứ đơn

| Tiêu chí so sánh | Quá khứ đơn (Past Simple) | Hiện tại hoàn thành (Present Perfect) |
| :--- | :--- | :--- |
| **Bản chất hành động** | Đã chấm dứt hoàn toàn trong quá khứ, không còn liên quan gì đến hiện tại | Bắt đầu trong quá khứ, còn kéo dài hoặc để lại kết quả ảnh hưởng tới hiện tại |
| **Mốc thời gian** | Xác định rõ ràng cụ thể (\`yesterday\`, \`in 2021\`, \`3 days ago\`, \`last month\`) | Không xác định hoặc kéo dài liên tục (\`so far\`, \`recently\`, \`for 3 years\`) |
| **Ví dụ minh họa** | *I lived in Chicago for 2 years.* (Hành động đã kết thúc, hiện tại không còn ở Chicago nữa) | *I have lived in Chicago for 2 years.* (Bắt đầu ở từ 2 năm trước và hiện tại vẫn đang ở Chicago) |
| **Trạng từ đi kèm** | \`ago\`, \`yesterday\`, \`last week\`, \`in [past year]\` | \`since\`, \`for\`, \`already\`, \`yet\`, \`so far\`, \`recently\` |

---

## 5. Tổng kết quy tắc làm nhanh câu hỏi Part 5 trong 3 giây
1. Nhìn 4 phương án thấy chia động từ $\rightarrow$ tìm ngay dấu hiệu thời gian ở cuối câu hoặc cạnh chỗ trống.
2. Thấy xuất hiện \`since + mốc\` hoặc \`for + khoảng\` $\rightarrow$ kiểm tra ngay đáp án có dạng \`have/has + V3/ed\`.
3. Nếu chủ ngữ là danh từ không đếm được (\`information, equipment, luggage\`) $\rightarrow$ chia số ít \`has\`.
`,
      });
      await this.lessonRepo.save(lesson1_1);

      // Lesson 1.2: Quá khứ đơn
      const lesson1_2 = this.lessonRepo.create({
        categoryId: savedCat1.id,
        title: 'Thì Quá Khứ Đơn (Past Simple Tense)',
        slug: 'thi-qua-khu-don-past-simple-tense',
        summary:
          'Quy tắc phát âm đuôi -ed, bảng động từ bất quy tắc phổ biến và dấu hiệu nhận biết chuyên sâu cho đề thi TOEIC.',
        estimatedReadTimeMinutes: 7,
        orderIndex: 2,
        isPublished: true,
        contentMarkdown: `# THÌ QUÁ KHỨ ĐƠN (PAST SIMPLE TENSE)

## 1. Cấu trúc ngữ pháp trọng tâm

> [!FORMULA]
> **Động từ To Be:**  
> (+) \`S + was / were + (O/Adj)\` (I/He/She/It đi với was; You/We/They đi với were)  
> (-) \`S + was / were + not + (O/Adj)\`  
> (?) \`Was / Were + S + (O/Adj)?\`  
> **Động từ thường:**  
> (+) \`S + V2/ed + (O)\`  
> (-) \`S + did not (didn't) + V_inf + (O)\`  
> (?) \`Did + S + V_inf + (O)?\`

---

## 2. Dấu hiệu nhận biết trong bài thi TOEIC

> [!TIP]
> - \`yesterday\`, \`yesterday morning\`
> - \`last night\`, \`last month\`, \`last year\`
> - \`... ago\` (*two hours ago, five days ago*)
> - \`in + mốc năm quá khứ\` (*in 2018, in the 1990s*)
> - Cụm từ: \`formerly\`, \`previously\`, \`at that time\`

---

## 3. Quy tắc phát âm đuôi -ed (Listening Part 1 & Part 2)

| Cách phát âm | Âm tận cùng của động từ gốc | Ví dụ |
| :--- | :--- | :--- |
| **/ɪd/** | Tận cùng là /t/ hoặc /d/ | *wanted, needed, decided, visited* |
| **/t/** | Tận cùng là âm vô thanh (/p/, /k/, /f/, /s/, /ʃ/, /tʃ/) | *stopped, looked, laughed, watched* |
| **/d/** | Các nguyên âm và âm hữu thanh còn lại | *cleaned, played, loved, opened* |

---

## 4. Bẫy đề thi Part 5: Trợ động từ Did
> [!WARNING]
> Khi đã có trợ động từ \`did\` hoặc \`didn't\`, động từ theo sau **bắt buộc phải ở dạng nguyên mẫu không "to" (V_inf)**.  
> ❌ *Sai:* The manager did not approved the budget request.  
> ✅ *Đúng:* The manager did not **approve** the budget request.
`,
      });
      await this.lessonRepo.save(lesson1_2);

      // 2. Chuyên đề 2: Mệnh đề quan hệ & Rút gọn
      const cat2 = this.categoryRepo.create({
        title: 'Mệnh Đề Quan Hệ & Kỹ Thuật Rút Gọn',
        description:
          'Chinh phục các câu hỏi mệnh đề quan hệ (Who, Whom, Which, That, Whose) và kỹ thuật rút gọn V-ing / V3/ed trong 5 giây.',
        targetLevel: CefrLevel.B1,
        iconName: 'link',
        colorCode: '#059669',
        orderIndex: 2,
        isActive: true,
      });
      const savedCat2 = await this.categoryRepo.save(cat2);

      // Lesson 2.1: Mệnh đề quan hệ
      const lesson2_1 = this.lessonRepo.create({
        categoryId: savedCat2.id,
        title: 'Mệnh Đề Quan Hệ Xác Định & Không Xác Định',
        slug: 'menh-de-quan-he-xac-dinh-va-khong-xac-dinh',
        summary:
          'Phân biệt Who, Whom, Which, That, Whose và quy tắc dấu phẩy với danh từ riêng trong câu văn thương mại.',
        estimatedReadTimeMinutes: 10,
        orderIndex: 1,
        isPublished: true,
        contentMarkdown: `# MỆNH ĐỀ QUAN HỆ TRONG ĐỀ THI TOEIC

## 1. Đại từ quan hệ cơ bản

> [!FORMULA]
> - **Who:** Thay cho danh từ chỉ người, làm chủ ngữ: \`N(người) + WHO + V + O\`
> - **Whom:** Thay cho danh từ chỉ người, làm tân ngữ: \`N(người) + WHOM + S + V\`
> - **Which:** Thay cho danh từ chỉ vật: \`N(vật) + WHICH + V / S + V\`
> - **That:** Thay cho cả người và vật trong mệnh đề quan hệ xác định (KHÔNG dùng sau dấu phẩy).
> - **Whose:** Chỉ sự sở hữu: \`N(chủ sở hữu) + WHOSE + N(vật sở hữu) + V\`

---

## 2. Bẫy đề thi TOEIC: Dấu phẩy và Giới từ

> [!WARNING]
> **Tuyệt đối không dùng "THAT" trong 2 trường hợp sau:**
> 1. Đi ngay sau **dấu phẩy (,)** (mệnh đề quan hệ không xác định).
> 2. Đi ngay sau **giới từ** (*in, on, at, with, about...*).  
> ❌ *Sai:* The contract, that was signed yesterday, is confidential.  
> ✅ *Đúng:* The contract, **which** was signed yesterday, is confidential.  
> ❌ *Sai:* The candidate in that we were interested has withdrawn.  
> ✅ *Đúng:* The candidate in **whom** we were interested has withdrawn.
`,
      });
      await this.lessonRepo.save(lesson2_1);

      this.logger.log('Khởi tạo thành công 2 chuyên đề và 3 bài giảng ngữ pháp mẫu!');
    } catch (error) {
      this.logger.warn(`Lỗi khởi tạo dữ liệu mẫu ngữ pháp: ${(error as Error).message}`);
    }
  }
}


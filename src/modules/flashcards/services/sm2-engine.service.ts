import { Injectable } from '@nestjs/common';
import { FlashcardStatus } from '../entities/user-flashcard-progress.entity';

export interface Sm2CalculationInput {
  currentRepetition: number;
  currentInterval: number;
  currentEaseFactor: number;
  rating: number; // 1 | 2 | 3 | 4
  baseDate?: Date;
  previousDueDate?: string | null;
}

export interface Sm2CalculationOutput {
  nextRepetition: number;
  nextInterval: number;
  nextEaseFactor: number;
  nextDueDate: string; // YYYY-MM-DD
  status: FlashcardStatus;
  isMastered: boolean;
}

@Injectable()
export class Sm2EngineService {
  public readonly MIN_EASE_FACTOR = 1.30;
  public readonly DEFAULT_EASE_FACTOR = 2.50;

  /**
   * Tính toán các tham số thuật toán SuperMemo-2 (SM-2) khoa học
   */
  public calculateNextSchedule(input: Sm2CalculationInput): Sm2CalculationOutput {
    const {
      currentRepetition,
      currentInterval,
      currentEaseFactor,
      rating,
      baseDate = new Date(),
      previousDueDate,
    } = input;

    // 1. Cập nhật Hệ số Ease Factor (EF')
    const prevEf = Number(currentEaseFactor) || this.DEFAULT_EASE_FACTOR;
    const deltaEf = 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02);
    let nextEf = prevEf + deltaEf;

    // Xử lý phạt quá hạn lâu ngày (> 20 ngày) khi quên từ (q < 3)
    if (previousDueDate && rating < 3) {
      const prevDueTime = new Date(previousDueDate).getTime();
      const nowTime = baseDate.getTime();
      const overdueDays = Math.floor((nowTime - prevDueTime) / (1000 * 3600 * 24));
      if (overdueDays > 20) {
        nextEf -= 0.20; // Phạt thêm 0.20 do bỏ quên quá lâu
      }
    }

    // Đảm bảo không tụt dưới ngưỡng sàn 1.30
    if (nextEf < this.MIN_EASE_FACTOR) {
      nextEf = this.MIN_EASE_FACTOR;
    }

    // 2. Tính số lần lặp thành công liên tiếp (n) và khoảng cách ngày ôn (I)
    let nextRepetition: number;
    let nextInterval: number;

    if (rating >= 3) {
      nextRepetition = currentRepetition + 1;

      if (nextRepetition === 1) {
        nextInterval = 1;
      } else if (nextRepetition === 2) {
        nextInterval = 6;
      } else {
        const intervalBase = currentInterval > 0 ? currentInterval : 1;
        nextInterval = Math.round(intervalBase * nextEf);
        if (nextInterval <= currentInterval) {
          nextInterval = currentInterval + 1;
        }
      }
    } else {
      // Đánh giá Quên (q < 3): Chuỗi thành công bị reset, gặp lại ngày mai
      nextRepetition = 0;
      nextInterval = 1;
    }

    // 3. Tính mốc ngày đến hạn (due_date) dạng YYYY-MM-DD
    const calcDate = new Date(baseDate);
    calcDate.setDate(calcDate.getDate() + nextInterval);
    const nextDueDate = calcDate.toISOString().split('T')[0];

    // 4. Xác định trạng thái thành thạo (Mastered)
    const isMastered = nextInterval > 21 && nextRepetition >= 3;
    const status = isMastered
      ? FlashcardStatus.MASTERED
      : nextRepetition > 0
        ? FlashcardStatus.LEARNING
        : FlashcardStatus.LEARNING;

    return {
      nextRepetition,
      nextInterval,
      nextEaseFactor: Number(nextEf.toFixed(2)),
      nextDueDate,
      status,
      isMastered,
    };
  }
}


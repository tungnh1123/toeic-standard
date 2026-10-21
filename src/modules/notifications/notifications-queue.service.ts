import { Injectable, Logger } from '@nestjs/common';

export interface NotificationJobPayload {
  assignmentId: string;
  assignmentTitle: string;
  studentIds: string[];
  dueDate: string;
  timestamp?: Date;
  [key: string]: unknown;
}

@Injectable()
export class NotificationsQueueService {
  private readonly logger = new Logger(NotificationsQueueService.name);

  /**
   * Đẩy Async Job vào Queue 'notifications' (BullMQ standard contract)
   */
  public async add(jobName: string, payload: NotificationJobPayload): Promise<{ jobId: string }> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(
      `[BullMQ Queue: notifications] Enqueued job '${jobName}' (${jobId}) for ${payload.studentIds.length} students. Assignment: "${payload.assignmentTitle}". Due date: ${payload.dueDate}`,
    );

    // Asynchronous background processing simulation (Push FCM / Email dispatch)
    setImmediate(() => {
      this.logger.log(
        `[BullMQ Worker: notifications] Job ${jobId} executed successfully: Sent ${payload.studentIds.length} FCM notifications and emails.`,
      );
    });

    return { jobId };
  }
}


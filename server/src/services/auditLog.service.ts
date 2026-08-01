import DB_Connection from '../models/DB_Connection.js';
import type { IAuditLog } from '../models/Schema/AuditLogSchema.js';

type AuditTargetType = IAuditLog['targetType'];

interface AuditLogInput {
  action: string;
  restaurant?: string | null;
  actor?: string | null;
  actorInfo?: { name?: string | undefined; role?: string | undefined } | undefined;
  targetType: AuditTargetType;
  targetId?: string | null;
  summary: string;
  meta?: unknown;
}

/** Ghi một bản ghi audit log (không throw — lỗi ghi log không làm hỏng nghiệp vụ chính). */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await DB_Connection.AuditLog.create({
      action: input.action,
      restaurant: input.restaurant || undefined,
      actor: input.actor || undefined,
      actorInfo: input.actorInfo?.role
        ? { name: input.actorInfo.name, role: input.actorInfo.role }
        : input.actorInfo?.name
          ? { name: input.actorInfo.name }
          : undefined,
      targetType: input.targetType,
      targetId: input.targetId || undefined,
      summary: input.summary,
      meta: input.meta,
    });
  } catch (error) {
    console.error('writeAuditLog error:', error);
  }
}

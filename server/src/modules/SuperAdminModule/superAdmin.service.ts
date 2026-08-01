import DB_Connection from '../../models/DB_Connection.js';
import type { ServiceResponse } from '../../shared/type.js';
import { applySubscriptionState, EXPIRING_WARNING_DAYS } from '../../services/subscription.service.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

const day = 24 * 3600 * 1000;

class SuperAdminService {
  /**
   * GET /api/admin/dashboard — KPI nền tảng (chỉ super-admin).
   * - 4 KPI: số chủ đang trial, số chủ active, số nhà hàng đang hoạt động, doanh thu tháng này.
   * - Biểu đồ doanh thu 6 tháng gần nhất (theo Transaction).
   * - Bảng "người thuê gần đây" và "nhà hàng sắp hết hạn ≤ 7 ngày".
   */
  async getDashboard(): Promise<ServiceResponse<any>> {
    const now = new Date();

    // Chủ = user role admin (sở hữu ≥ 1 nhà hàng). Trạng thái chủ theo nhà hàng họ sở hữu.
    const owners = await DB_Connection.User.find({ role: 'admin' })
      .select('_id name email isActive')
      .lean();
    const ownerIds = owners.map((o: any) => o._id);

    const ownerRestaurants = ownerIds.length
      ? await DB_Connection.Restaurant.find({ ownerId: { $in: ownerIds } })
          .select('ownerId subscription trialEndsAt paidUntil status')
          .lean()
      : [];

    const ownerStatus = new Map<string, Set<string>>();
    for (const o of owners as any[]) {
      ownerStatus.set(String(o._id), new Set());
    }
    for (const r of ownerRestaurants as any[]) {
      // Tính trạng thái theo ngày hiện tại để không phụ thuộc cron
      const state = (await applySubscriptionState(String(r._id)))?.subscription || r.subscription;
      ownerStatus.get(String(r.ownerId))?.add(state);
    }

    // 4 KPI
    let trialOwners = 0;
    let activeOwners = 0;
    for (const [states] of ownerStatus) {
      // Chủ đang active nếu có ít nhất 1 nhà hàng active/trial; nếu mọi nhà hàng locked → không active
      void states;
    }
    // Tính lại rõ ràng: active owner = có ≥1 nhà hàng active; trial owner = không active nhưng có ≥1 trial
    const ownerStatusArr = Array.from(ownerStatus.entries());
    for (const [, states] of ownerStatusArr) {
      if (states.has('active')) activeOwners++;
      else if (states.has('trial')) trialOwners++;
    }

    const activeRestaurants = await DB_Connection.Restaurant.countDocuments({ status: 'active' });

    // Doanh thu tháng này (Transaction status = paid)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenueAgg = await DB_Connection.Transaction.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthRevenue = monthRevenueAgg[0]?.total || 0;

    // Biểu đồ doanh thu 6 tháng gần nhất
    const revenueByMonth: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await DB_Connection.Transaction.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      revenueByMonth.push({
        month: `${start.getMonth() + 1}/${start.getFullYear()}`,
        total: agg[0]?.total || 0,
      });
    }

    // Người thuê gần đây (top 10, kèm số nhà hàng + tổng đã trả)
    const recentOwners = await this.buildOwnerSummaries(owners as any[], ownerRestaurants as any[], 10);

    // Nhà hàng sắp hết hạn ≤ 7 ngày (trial hoặc active)
    const expiringThreshold = new Date(now.getTime() + EXPIRING_WARNING_DAYS * day);
    const expiringRestaurants = await DB_Connection.Restaurant.find({
      $or: [
        { subscription: 'trial', trialEndsAt: { $gte: now, $lte: expiringThreshold } },
        { subscription: 'active', paidUntil: { $gte: now, $lte: expiringThreshold } },
      ],
    })
      .select('name subscription trialEndsAt paidUntil ownerId')
      .populate('ownerId', 'name email')
      .lean();

    return {
      message: 'Lấy thống kê nền tảng thành công!',
      code: 200,
      data: {
        kpis: {
          trialOwners,
          activeOwners,
          activeRestaurants,
          monthRevenue,
        },
        revenueByMonth,
        recentOwners,
        expiringRestaurants,
      },
    };
  }

  /** Dựng tóm tắt chủ (số nhà hàng, trạng thái, tổng đã trả, ngày đăng ký). */
  private async buildOwnerSummaries(
    owners: any[],
    ownerRestaurants: any[],
    limit?: number,
  ): Promise<any[]> {
    const txAgg = await DB_Connection.Transaction.aggregate([
      { $match: { ownerId: { $in: owners.map((o) => o._id) } } },
      { $group: { _id: '$ownerId', totalPaid: { $sum: '$amount' } } },
    ]);
    const paidMap = new Map(txAgg.map((t) => [String(t._id), t.totalPaid]));

    const byOwner = new Map<string, any[]>();
    for (const r of ownerRestaurants as any[]) {
      const key = String(r.ownerId);
      if (!byOwner.has(key)) byOwner.set(key, []);
      byOwner.get(key)!.push(r);
    }

    const summaries: any[] = [];
    for (const o of owners) {
      const rs = byOwner.get(String(o._id)) || [];
      const states = new Set<string>();
      for (const r of rs) {
        const state = (await applySubscriptionState(String(r._id)))?.subscription || r.subscription;
        states.add(state);
      }
      let ownerState = 'locked';
      if (states.has('active')) ownerState = 'active';
      else if (states.has('trial')) ownerState = 'trial';
      summaries.push({
        _id: o._id,
        name: o.name,
        email: o.email,
        isActive: o.isActive,
        restaurantCount: rs.length,
        state: ownerState,
        totalPaid: paidMap.get(String(o._id)) || 0,
        createdAt: o.createdAt,
      });
    }

    summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return summaries.slice(0, limit);
  }

  /**
   * GET /api/admin/tenants — danh sách chủ (role admin) kèm tóm tắt.
   * ?id= để xem chi tiết 1 chủ (nhà hàng + giao dịch).
   */
  async getTenants(id?: string): Promise<ServiceResponse<any>> {
    if (id) {
      const owner = (await DB_Connection.User.findById(id).lean()) as any;
      if (!owner || owner.role !== 'admin') {
        return { message: 'Chủ không tồn tại!', code: 404 };
      }
      const restaurants = await DB_Connection.Restaurant.find({ ownerId: owner._id })
        .select('name status subscription trialEndsAt paidUntil createdAt')
        .lean();
      const transactions = await DB_Connection.Transaction.find({ ownerId: owner._id })
        .populate('restaurant', 'name')
        .sort({ createdAt: -1 })
        .lean();
      return {
        message: 'Lấy chi tiết chủ thành công!',
        code: 200,
        data: { owner, restaurants, transactions },
      };
    }

    const owners = await DB_Connection.User.find({ role: 'admin' })
      .select('_id name email isActive createdAt')
      .lean();
    const ownerIds = owners.map((o: any) => o._id);
    const ownerRestaurants = ownerIds.length
      ? await DB_Connection.Restaurant.find({ ownerId: { $in: ownerIds } })
          .select('ownerId subscription trialEndsAt paidUntil status')
          .lean()
      : [];
    const summaries = await this.buildOwnerSummaries(owners as any[], ownerRestaurants as any[]);
    return { message: 'Lấy danh sách chủ thành công!', code: 200, data: summaries };
  }

  /**
   * GET /api/admin/transactions — lịch sử thanh toán + filter (ownerId, restaurantId, từ/đến ngày).
   */
  async getTransactions(filters: {
    ownerId?: string;
    restaurantId?: string;
    from?: string;
    to?: string;
  }): Promise<ServiceResponse<any>> {
    const query: any = {};
    if (filters.ownerId) query.ownerId = filters.ownerId;
    if (filters.restaurantId) query.restaurant = filters.restaurantId;
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }
    const transactions = await DB_Connection.Transaction.find(query)
      .populate('restaurant', 'name')
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return { message: 'Lấy lịch sử giao dịch thành công!', code: 200, data: transactions };
  }

  /**
   * PATCH /api/admin/users/:id/block — khoá/mở chủ.
   * blocked=true → isActive=false cho mọi user của chủ (admin/manager/staff thuộc nhà hàng của chủ).
   * Audit: user.block / user.unblock.
   */
  async blockOwner(id: string, blocked: boolean, actorUserId?: string): Promise<ServiceResponse<any>> {
    const owner = (await DB_Connection.User.findById(id).lean()) as any;
    if (!owner) return { message: 'Chủ không tồn tại!', code: 404 };
    if (owner.role !== 'admin') {
      return { message: 'Chỉ khoá/mở được tài khoản chủ nhà hàng (admin)!', code: 400 };
    }

    // Mọi nhà hàng của chủ
    const restaurants = await DB_Connection.Restaurant.find({ ownerId: id }).select('_id').lean();
    const restaurantIds = restaurants.map((r: any) => r._id);

    // Mọi user thuộc các nhà hàng đó (admin/manager/staff) + chính chủ
    const affectedUserIds = new Set<string>([String(id)]);
    if (restaurantIds.length) {
      const members = await DB_Connection.User.find({
        role: { $in: ['admin', 'manager', 'staff'] },
        restaurantIds: { $in: restaurantIds },
      })
        .select('_id')
        .lean();
      for (const m of members as any[]) affectedUserIds.add(String(m._id));
    }

    await DB_Connection.User.updateMany(
      { _id: { $in: Array.from(affectedUserIds) } },
      { $set: { isActive: blocked ? false : true } },
    );

    await writeAuditLog({
      action: blocked ? 'user.block' : 'user.unblock',
      actor: actorUserId || null,
      actorInfo: { role: 'super-admin' },
      targetType: 'user',
      targetId: owner._id,
      summary: `${blocked ? 'Khoá' : 'Mở khoá'} chủ "${(owner as any).name}" (${
        affectedUserIds.size
      } tài khoản, ${restaurantIds.length} nhà hàng)`,
    });

    return {
      message: blocked ? 'Đã khoá chủ và toàn bộ tài khoản liên quan!' : 'Đã mở khoá chủ!',
      code: 200,
      data: { ownerId: id, blocked, affectedUsers: affectedUserIds.size },
    };
  }
}

export default new SuperAdminService();

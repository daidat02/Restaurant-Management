import type { IRestaurant } from '../../models/Schema/RestaurantSchema.js';
import restaurantRepository from './restaurant.repository.js';
import authRepository from '../AuthModule/auth.repository.js';
import pricingService from '../SubscriptionModule/pricing.service.js';
import DB_Connection from '../../models/DB_Connection.js';
import { TRIAL_DAYS } from '../../services/subscription.service.js';
import { generateTransactionId } from '../../services/transaction-id.service.js';

class RestaurantSerice {
  /**
   * Tạo nhà hàng cho chủ (role admin):
   * - Nhà hàng ĐẦU TIÊN → trial (trialEndsAt = now + 30 ngày), không tính phí.
   * - Nhà hàng 2+ → yêu cầu `cycleMonths` (mặc định 1):
   *   - `activation: 'pending'` (mặc định 'paid') → tạo ở trạng thái chờ thanh toán, KHÔNG tạo Transaction.
   *   - `activation: 'paid'` → tạo Transaction(paid) + subscription = active (hành vi hiện tại).
   * - Chặn nếu tài khoản chủ bị khoá (isActive=false).
   */
  async createRestaurantService(restaurantData: any, userId?: string): Promise<any> {
    if (!userId) {
      return { message: 'Thiếu người tạo nhà hàng!', code: 403 };
    }

    const owner = await authRepository.findUserById(userId);
    if (!owner || owner.role !== 'admin') {
      return { message: 'Chỉ chủ nhà hàng (admin) mới được mở nhà hàng!', code: 403 };
    }
    if (!owner.isActive) {
      return { message: 'Tài khoản của bạn đã bị khoá!', code: 403 };
    }

    const existingIds = (owner.restaurantIds || []).map((id: any) => id.toString());
    const isFirstRestaurant = existingIds.length === 0;
    // Trang tạo chi nhánh mới (2+) thanh toán thật → tạo pending; modal/wizard giữ mặc định 'paid'.
    const isPending = restaurantData?.activation === 'pending';

    const now = new Date();
    let subscription: 'trial' | 'active' | 'pending' = 'trial';
    let trialEndsAt: Date | undefined;
    let paidUntil: Date | undefined;
    const planId = restaurantData?.planId || restaurantData?.planKey;

    if (isFirstRestaurant) {
      // Nhà hàng đầu tiên: trial 30 ngày
      subscription = 'trial';
      trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
    } else {
      // Nhà hàng 2+: bắt buộc trả trước theo chu kỳ + gói (mặc định gói rẻ nhất, chu kỳ 1 tháng)
      const cycleMonths = Number(restaurantData?.cycleMonths ?? restaurantData?.cycle ?? 1);
      const price = planId
        ? await pricingService.getPlanPriceForCycle(planId, cycleMonths)
        : await pricingService.getPriceForCycle(cycleMonths);
      if (!price) {
        return {
          message: `Chu kỳ thanh toán không hợp lệ! Chỉ hỗ trợ 1/3/6/12 tháng.`,
          code: 400,
        };
      }
      if (isPending) {
        // Chờ thanh toán: kích hoạt sau khi webhook PayOS/VNPay hoàn tất (completeSubscription)
        subscription = 'pending';
      } else {
        subscription = 'active';
        paidUntil = new Date(now.getTime() + cycleMonths * 30 * 24 * 3600 * 1000);
      }
    }

    // Gói chính thức của nhà hàng mới: theo gói đã chọn, nếu không chọn thì gói rẻ nhất.
    const assignedPlanKey = planId || (await pricingService.getDefaultPlanKey());

    const restaurant = await restaurantRepository.createRestaurant({
      ...restaurantData,
      ownerId: owner._id,
      subscription,
      trialEndsAt,
      paidUntil,
      // Mọi nhà hàng đều có gói mặc định (thấp nhất) làm mốc so sánh khi chuyển gói.
      currentPlanKey: assignedPlanKey ?? undefined,
    });

    // Nhà hàng 2+: ghi giao dịch thanh toán (kèm gói)
    let transaction: any;
    if (!isFirstRestaurant && paidUntil && restaurant?._id) {
      const cycleMonths = Number(restaurantData?.cycleMonths ?? restaurantData?.cycle ?? 1);
      const price = planId
        ? ((await pricingService.getPlanPriceForCycle(planId, cycleMonths)) as number)
        : ((await pricingService.getPriceForCycle(cycleMonths)) as number);
      const planName = planId ? await pricingService.getPlanName(planId) : null;
      transaction = await DB_Connection.Transaction.create({
        restaurant: restaurant._id,
        ownerId: owner._id,
        transactionId: await generateTransactionId(),
        amount: price,
        cycleMonths,
        type: 'restaurant-fee',
        status: 'paid',
        paidUntil,
        planKey: planId ?? undefined,
        planName: planName ?? undefined,
      });
    }

    // Người tạo (admin) trở thành admin của cơ sở mới — cần thiết để switch-tenant sang cơ sở này
    if (restaurant?._id) {
      await authRepository.addRestaurantToUser(userId, String(restaurant._id));
    }
    return {
      message: isFirstRestaurant
        ? 'Tạo nhà hàng thành công! Bạn đang dùng thử miễn phí 30 ngày.'
        : isPending
          ? 'Tạo nhà hàng thành công! Nhà hàng đang chờ thanh toán.'
          : 'Tạo nhà hàng thành công! Nhà hàng đã được kích hoạt.',
      data: restaurant,
      transaction: transaction ? { id: String(transaction._id), amount: transaction.amount } : undefined,
      code: 201,
    };
  }

  async getRestaurantByIdService(id: string): Promise<any> {
    const restaurant = await restaurantRepository.findRestaurantById(id);
    if (!restaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    return { message: 'Lấy nhà hàng thành công!!!', data: restaurant, code: 200 };
  }

  async findAllRestaurantsService(): Promise<any> {
    const restaurants = await restaurantRepository.findRestaurants({});
    return { message: 'Lấy danh sách nhà hàng thành công!!!', data: restaurants, code: 200 };
  }

  /**
   * Danh sách nhà hàng thuộc sở hữu của user (admin/manager) — dựa trên restaurantIds trong DB,
   * KHÔNG tin bất kỳ param nào từ client. Admin chưa có nhà hàng → trả mảng rỗng (không lỗi).
   */
  async findMyRestaurantsService(userId?: string): Promise<any> {
    if (!userId) {
      return { message: 'Chưa xác thực người dùng!', code: 401 };
    }
    const user = await DB_Connection.User.findById(userId).select('restaurantIds').exec();
    const ownedIds = (user?.restaurantIds || []).map((id: any) => id.toString());
    const restaurants = await restaurantRepository.findRestaurants({ _id: { $in: ownedIds } });
    return { message: 'Lấy danh sách nhà hàng thành công!!!', data: restaurants, code: 200 };
  }

  async updateRestaurantService(id: string, restaurantData: any): Promise<any> {
    const exitRestaurant = await restaurantRepository.findRestaurantById(id);
    if (!exitRestaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    const restaurant = await restaurantRepository.updateRestaurant(id, restaurantData);
    return { message: 'Cập nhật nhà hàng thành công!!!', data: restaurant, code: 200 };
  }

  async deleteRestaurantService(id: string): Promise<any> {
    const exitRestaurant = await restaurantRepository.findRestaurantById(id);
    if (!exitRestaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    const result = await restaurantRepository.deleteRestaurant(id);
    if (!result) {
      return { message: 'Xóa nhà hàng thất bại!!!', code: 500 };
    }
    return { message: 'Xóa nhà hàng thành công!!!', code: 200 };
  }
}

export default RestaurantSerice;

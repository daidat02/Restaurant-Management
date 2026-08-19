import { useMemo } from 'react';
import { usePlanContext, type LimitResource } from '@/contexts/PlanContext';
import { FEATURE_CATALOG, getFeatureLabel, type FeatureKey } from '@/constants/feature-catalog';

export type { LimitResource } from '@/contexts/PlanContext';

/**
 * PLAN CỦA NHÀ HÀNG ĐANG LÀM VIỆC — nguồn gate UX duy nhất.
 * Gom toàn bộ các cờ trạng thái tính năng để ở Page chỉ việc sử dụng.
 */
export const usePlan = () => {
  const context = usePlanContext();
  const { hasFeature } = context;

  // Gom toàn bộ trạng thái tính năng vào object permissions
  const permissions = useMemo(() => {
    const payosAllowed = hasFeature('payos');
    const qrManualAllowed = hasFeature('qr_manual');

    return {
      // Báo cáo & Đặt món
      hasKds: hasFeature('kds'),
      hasCart: hasFeature('cart'),
      hasScanToOrder: hasFeature('scan_to_order'),
      hasReservation: hasFeature('reservation'),
      hasAdvancedReport: hasFeature('advanced_report'),
      hasMessagingGroup: hasFeature('messaging_group'),
      hasWhiteLabel: hasFeature('white_label'),
      hasApi: hasFeature('api'),

      // Thanh toán
      payosAllowed,
      qrManualAllowed,
      /** Bị khóa Chuyển khoản ngân hàng thủ công (khi cả 2 gói đều không hỗ trợ) */
      bankTransferBlocked: !qrManualAllowed && !payosAllowed,
    };
  }, [hasFeature]);

  return {
    ...context,
    ...permissions,
    FEATURE_CATALOG,
    getFeatureLabel,
  };
};

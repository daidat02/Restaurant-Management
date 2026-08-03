import type{ Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import DB_Connection from '../models/DB_Connection.js';
import { Socket } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string; role: string; restaurantId?: string; restaurantIds?: string[]; scope?: string };
  /** Nhà hàng đang hoạt động (được xác thực từ token, hoặc do super-admin chỉ định). */
  tenantId?: string;
}

export interface SocketCustom extends Socket{
  user?:JwtPayload & {userId:string,role:string, restaurantId?:string, restaurantIds?:string[]}
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.headers.authorization;

  try {
    // Kiểm tra token có tồn tại và đúng định dạng
    if (!token || !token.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập!!!" });
    }

    const accessToken = token.split(" ")[1];

    // Xác thực token
    jwt.verify(
      accessToken ||'',
      process.env.JWT_ACCESS_SECRET || "",
      (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Token không hợp lệ!!!" });
        }

        // Kiểm tra _id trong decoded
        const { _id, role, restaurantId, scope } = decoded as JwtPayload & {
          _id: string;
          role: string;
          restaurantId?: string;
          scope?: string;
        };
        if (!_id) {
          return res.status(403).json({ message: "Token không chứa _id hợp lệ!" });
        }
        
        // Token KDS (mã nhà bếp): không phải user thật, chỉ xác định ngữ cảnh nhà hàng
        if (scope === "kds") {
          req.user = { userId: _id, role: "kds", restaurantId: _id };
          return next();
        }

        // Gán _id vào req.user.userId
        req.user = { userId: _id, role: role, ...(restaurantId ? { restaurantId } : {}) };
        next(); 
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server khi xác thực token!" });
  }
};


export const verifyRole = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    // super-admin luôn vượt qua kiểm tra vai trò (quản lý chéo mọi tenant)
    if (req.user && (req.user.role === "super-admin" || roles.includes(req.user.role))) {
      return next();
    }
    return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
  };
};


/**
 * Kiểm tra nhà hàng còn hoạt động hay không (dùng để chặn khi super-admin khoá nhà hàng).
 * Không áp dụng cho super-admin (quyền nền tảng, vẫn phải quản lý được nhà hàng bị khoá).
 */
const assertRestaurantActive = async (
  res: Response,
  restaurantId: string | undefined,
): Promise<boolean> => {
  if (!restaurantId) return false;
  const { applySubscriptionState } = await import('../services/subscription.service.js');
  const restaurant = await DB_Connection.Restaurant.findById(restaurantId)
    .select('status subscription trialEndsAt paidUntil')
    .exec();
  if (!restaurant) {
    res.status(404).json({ message: 'Nhà hàng không tồn tại!' });
    return false;
  }
  // Cập nhật trạng thái subscription theo ngày (trial/active hết hạn → locked)
  const state = await applySubscriptionState(restaurantId);
  if (restaurant.status === 'inactive' || state?.subscription === 'locked') {
    res.status(403).json({
      message: 'Nhà hàng bị khoá do hết hạn thanh toán. Vui lòng thanh toán để mở lại.',
      code: 'RESTAURANT_LOCKED',
    });
    return false;
  }
  return true;
};

/**
 * Lấy tenant (nhà hàng) do request chỉ định — ưu tiên query/params/body.
 * Không dùng `req.params.id` vì với route tài nguyên (:id bàn/món/đơn) đó là id tài nguyên,
 * không phải restaurantId; ownership tài nguyên do `requireResourceTenant` xử lý.
 */
const tenantFromRequest = (req: AuthRequest): string => {
  return String(
    req.query.restaurantId ||
      req.params.restaurantId ||
      req.params.targetId ||
      req.body?.restaurant ||
      req.body?.restaurantId ||
      req.body?.restaurantData?.restaurant ||
      "",
  );
};

/**
 * Intersect danh sách restaurantIds do request gửi với restaurantIds của user (đọc từ DB).
 * - Không gửi mảng: admin → toàn bộ chuỗi của chủ; manager/staff → tenant hiện tại (token).
 * - Có id ngoài phạm vi → 403; kết quả rỗng → 403.
 * Ghi danh sách hợp lệ vào `req.user.restaurantIds` để controller/service dùng (query $in).
 */
export const intersectRestaurantIds = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === "super-admin") return next();

    const user = await DB_Connection.User.findById(req.user?.userId)
      .select("restaurantIds")
      .exec();
    const ownedIds = (user?.restaurantIds || []).map((id: any) => id.toString());

    const raw = req.query.restaurantIds;
    let requested: string[] = [];
    if (Array.isArray(raw)) {
      requested = raw.map(String);
    } else if (typeof raw === "string") {
      requested = raw.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (raw) {
      requested = [String(raw)];
    }

    if (requested.length === 0) {
      // Không chỉ định → mặc định: admin toàn chuỗi, manager/staff tenant hiện tại
      if (req.user?.role === "admin") {
        requested = ownedIds;
      } else {
        requested = [req.tenantId ?? ownedIds[0] ?? ""].filter(Boolean);
      }
    }

    if (requested.some((id) => !ownedIds.includes(id))) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập các nhà hàng này!" });
    }
    if (requested.length === 0) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập các nhà hàng này!" });
    }

    req.user = {
      userId: String(req.user?.userId),
      role: String(req.user?.role),
      restaurantIds: requested,
    };
    return next();
  } catch (error) {
    console.error("intersectRestaurantIds error:", error);
    return res.status(500).json({ message: "Lỗi xác thực quyền nhà hàng!" });
  }
};

/**
 * Xác minh ngữ cảnh nhà hàng (tenant) cho request.
 * - Admin/manager/staff: lấy restaurantId từ token (claim `restaurantId`), kiểm tra user thực sự thuộc nhà hàng đó,
 *   gán `req.tenantId`. Chặn mọi request dùng restaurantId của nhà hàng khác.
 * - super-admin: bypass — `req.tenantId` lấy từ query/params/body (để quản lý chéo mọi tenant).
 * - admin (chủ chuỗi): bypass yêu cầu `currentRestaurantId` giống super-admin — `req.tenantId` lấy từ request,
 *   NHƯNG tenant chỉ định phải thuộc `restaurantIds` của chủ (ownership). Không áp dụng assertRestaurantActive
 *   (admin luôn vào được để xử lý thanh toán chi nhánh bị khoá).
 */
export const verifyTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const tokenRestaurantId = req.user?.restaurantId;

    // super-admin: tenant do chính request chỉ định
    if (role === "super-admin") {
      req.tenantId = String(
        req.query.restaurantId ||
          req.params.restaurantId ||
          req.params.id ||
          req.params.targetId ||
          req.body?.restaurant ||
          req.body?.restaurantId ||
          "",
      );
      return next();
    }

    // admin (chủ chuỗi): không bị ép chọn 1 nhà hàng, nhưng vẫn giữ `restaurantId` trong token
    // (restaurantIds[0]) làm tenant mặc định. Nếu request chỉ định tenant khác → phải thuộc chuỗi.
    if (role === "admin") {
      const user = await DB_Connection.User.findById(req.user?.userId)
        .select("restaurantIds")
        .exec();
      if (!user) {
        return res.status(401).json({ message: "Người dùng không tồn tại!" });
      }
      const ownedIds = (user.restaurantIds || []).map((id: any) => id.toString());
      req.user = {
        userId: String(req.user?.userId),
        role: String(req.user?.role),
        restaurantIds: ownedIds,
      };
      const requestedTenant = tenantFromRequest(req);
      if (requestedTenant) {
        if (!ownedIds.includes(requestedTenant)) {
          return res
            .status(403)
            .json({ message: "Bạn không sở hữu nhà hàng này!" });
        }
        req.tenantId = requestedTenant;
      } else {
        // Không chỉ định → fallback tenant mặc định trong token (restaurantIds[0])
        req.tenantId = tokenRestaurantId ?? "";
      }
      return next();
    }

    // Token KDS (mã nhà bếp): tin tưởng restaurantId trong token — không phải user thật
    if (role === "kds") {
      if (!tokenRestaurantId) {
        return res.status(403).json({ message: "Thiếu ngữ cảnh nhà hàng trong token KDS!" });
      }
      req.tenantId = tokenRestaurantId;
      // Nhà hàng bị khoá thì màn hình bếp cũng không hoạt động
      if (!(await assertRestaurantActive(res, req.tenantId))) return;
      return next();
    }

    if (!tokenRestaurantId) {
      return res
        .status(403)
        .json({ message: "Thiếu ngữ cảnh nhà hàng trong token. Hãy đăng nhập lại hoặc chuyển nhà hàng!" });
    }

    const user = await DB_Connection.User.findById(req.user?.userId).select("restaurantIds role restaurant").exec();
    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại!" });
    }
    if (user.role === "super-admin") {
      req.tenantId = tokenRestaurantId;
      return next();
    }

    // fallback `restaurant` legacy cho dữ liệu chưa backfill (sẽ dọn ở ticket 03)
    const belongs =
      (user.restaurantIds || []).some((id: any) => id.toString() === tokenRestaurantId) ||
      user.restaurant?.toString() === tokenRestaurantId;
    if (!belongs) {
      return res.status(403).json({ message: "Bạn không thuộc nhà hàng này!" });
    }

    req.tenantId = tokenRestaurantId;
    // Nhà hàng bị khoá → chặn mọi thao tác của admin/manager/staff của nhà hàng đó
    if (!(await assertRestaurantActive(res, req.tenantId))) return;
    return next();
  } catch (error) {
    console.error("verifyTenant error:", error);
    return res.status(500).json({ message: "Lỗi xác thực nhà hàng!" });
  }
};


export const authenticateToken = async (socket: SocketCustom, next: any) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Token required"));

    const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

    // Token KDS (mã nhà bếp): gán trực tiếp ngữ cảnh nhà hàng, không cần tra user
    if (decoded.scope === "kds") {
      const kdsRestaurantId = String(decoded.restaurantId || decoded._id || "");
      if (!kdsRestaurantId) return next(new Error("KDS token thiếu restaurantId"));
      socket.user = {
        userId: kdsRestaurantId,
        role: "kds",
        restaurantId: kdsRestaurantId,
        restaurantIds: [kdsRestaurantId],
      };
      socket.join(`restaurant_${kdsRestaurantId}`);
      return next();
    }

    // Tìm user trong DB
    const user = await DB_Connection.User.findById(decoded._id);
    if (!user) return next(new Error("User not found"));

    // Gắn user vào socket để các handler khác dùng
    // Fallback field `restaurant` legacy cho dữ liệu chưa backfill (dọn ở ticket 06)
    const restaurantIds = Array.from(
      new Set([
        ...(user.restaurantIds ?? []).map((id: any) => id.toString()),
        ...(user.restaurant ? [user.restaurant.toString()] : []),
      ]),
    );
    socket.user = { userId: user._id, role: user.role, restaurantIds };

    // Auto join phòng phù hợp
    if (user.role === "customer") {
      socket.join(`user_${user._id}`);
    }
    if (user.role !== "customer") {
      for (const restaurantId of restaurantIds) {
        socket.join(`restaurant_${restaurantId}`);
      }
    }

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return next(new Error("Invalid or expired token"));
  }
};

/**
 * Kiểm tra user socket có được phép truy cập dữ liệu của nhà hàng (tenant) không.
 * - super-admin: quyền nền tảng, truy cập mọi tenant.
 * - KDS: chỉ đúng nhà hàng của mã bếp.
 * - Admin/manager/staff/customer: phải thuộc danh sách restaurantIds.
 */
export const canAccessTenant = (
  user: SocketCustom["user"] | undefined,
  restaurantId: string,
): boolean => {
  if (!user || !restaurantId) return false;
  if (user.role === "super-admin") return true;
  if (user.role === "kds") {
    return user.restaurantIds?.includes(String(restaurantId)) ?? false;
  }
  return (user.restaurantIds ?? []).some((id) => String(id) === String(restaurantId));
};

/**
 * Resolver trả về tenant (nhà hàng) sở hữu tài nguyên, hoặc mảng tenant nếu tài nguyên thuộc nhiều nơi.
 * Trả null khi tài nguyên không tồn tại (tránh leak thông tin sự tồn tại).
 */
type ResourceTenantResolver = (req: AuthRequest) => Promise<string | string[] | null>;

/**
 * Ownership middleware: yêu cầu tài nguyên (qua :id / :paymentId) thuộc đúng tenant đang xác thực.
 * - Tài nguyên không tồn tại → 404 (không leak).
 * - Tài nguyên thuộc tenant khác → 403.
 * - super-admin: bypass (quyền nền tảng, quản lý chéo mọi tenant).
 * - Không yêu cầu middleware `verifyTenant` phía trước — dùng `req.tenantId` nếu có, nếu không fallback `req.user.restaurantId`.
 */
export const requireResourceTenant =
  (resolveResourceTenant: ResourceTenantResolver) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === "super-admin") return next();

      const resourceTenant = await resolveResourceTenant(req);
      if (!resourceTenant) {
        return res.status(404).json({ message: "Không tìm thấy tài nguyên!" });
      }

      // admin (chủ chuỗi): tài nguyên phải thuộc MỘT trong các restaurantIds của chủ
      if (req.user?.role === "admin") {
        const user = await DB_Connection.User.findById(req.user.userId)
          .select("restaurantIds")
          .exec();
        const ownedIds = (user?.restaurantIds || []).map((id: any) => id.toString());
        const owned = Array.isArray(resourceTenant)
          ? resourceTenant.some((id) => ownedIds.includes(String(id)))
          : ownedIds.includes(String(resourceTenant));
        if (!owned) {
          return res
            .status(403)
            .json({ message: "Bạn không có quyền truy cập tài nguyên này!" });
        }
        return next();
      }

      const actorTenant = req.tenantId ?? req.user?.restaurantId;
      if (!actorTenant) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền truy cập tài nguyên này!" });
      }

      const owned = Array.isArray(resourceTenant)
        ? resourceTenant.some((id) => String(id) === String(actorTenant))
        : String(resourceTenant) === String(actorTenant);

      if (!owned) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền truy cập tài nguyên này!" });
      }
      return next();
    } catch (error) {
      console.error("requireResourceTenant error:", error);
      return res.status(500).json({ message: "Lỗi xác thực quyền tài nguyên!" });
    }
  };

// ---- Resolver tài nguyên → tenant (dùng cho requireResourceTenant) ----

export const tableTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Table.findById(req.params.id).select("restaurant").exec();
  return doc?.restaurant?.toString?.() ?? null;
};

export const menuCategoryTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.MenuCategory.findById(req.params.id).select("restaurant").exec();
  return doc?.restaurant?.toString?.() ?? null;
};

export const menuItemTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.MenuItem.findById(req.params.id).select("restaurant").exec();
  return doc?.restaurant?.toString?.() ?? null;
};

export const orderTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Order.findById(req.params.id).select("restaurant").exec();
  return doc?.restaurant?.toString?.() ?? null;
};

export const reservationTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Reservation.findById(req.params.id)
    .select("restaurant")
    .exec();
  return doc?.restaurant?.toString?.() ?? null;
};

export const settingTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Setting.findById(req.params.id)
    .select("scope targetModel targetId")
    .exec();
  if (!doc) return null;
  // Setting hệ thống (scope = admin) không thuộc tenant nào → chỉ super-admin (đã bypass) truy cập.
  if (doc.scope !== "restaurant" || doc.targetModel !== "Restaurant") return null;
  return doc.targetId?.toString?.() ?? null;
};

export const userTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.User.findById(req.params.id)
    .select("restaurantIds restaurant")
    .exec();
  if (!doc) return null;
  const ids = Array.from(
    new Set(
      [
        ...(doc.restaurantIds ?? []).map((id: any) => String(id)),
        doc.restaurant?.toString ? String(doc.restaurant) : "",
      ].filter(Boolean),
    ),
  );
  return ids.length ? ids : null;
};

export const restaurantTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Restaurant.findById(req.params.id).select("_id").exec();
  return doc ? String(doc._id) : null;
};

export const paymentTenantResolver: ResourceTenantResolver = async (req) => {
  const doc = await DB_Connection.Payment.findById(req.params.paymentId)
    .select("restaurant")
    .exec();
  return doc?.restaurant?.toString?.() ?? null;
};
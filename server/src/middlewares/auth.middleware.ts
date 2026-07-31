import type{ Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import DB_Connection from '../models/DB_Connection.js';
import { Socket } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string; role: string; restaurantId?: string };
  /** Nhà hàng đang hoạt động (được xác thực từ token, hoặc do super-admin chỉ định). */
  tenantId?: string;
}

export interface SocketCustom extends Socket{
  user?:JwtPayload & {userId:string,role:string, restaurantIds?:string[]}
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
        const { _id, role, restaurantId } = decoded as JwtPayload & {
          _id: string;
          role: string;
          restaurantId?: string;
        };
        if (!_id) {
          return res.status(403).json({ message: "Token không chứa _id hợp lệ!" });
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
 * Xác minh ngữ cảnh nhà hàng (tenant) cho request.
 * - Admin/manager/staff: lấy restaurantId từ token (claim `restaurantId`), kiểm tra user thực sự thuộc nhà hàng đó,
 *   gán `req.tenantId`. Chặn mọi request dùng restaurantId của nhà hàng khác.
 * - super-admin: bypass — `req.tenantId` lấy từ query/params/body (để quản lý chéo mọi tenant).
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

    // Tìm user trong DB
    const user = await DB_Connection.User.findById(decoded._id);
    if (!user) return next(new Error("User not found"));

    // Gắn user vào socket để các handler khác dùng
    const restaurantIds = (user.restaurantIds ?? []).map((id: any) => id.toString());
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
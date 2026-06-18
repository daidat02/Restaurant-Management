import type{ Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import DB_Connection from '../models/DB_Connection.js';
import { Socket } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string , role: string };
}

export interface SocketCustom extends Socket{
  user?:JwtPayload & {userId:string,role:string, restaurant?:string}
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
        const { _id, role } = decoded as JwtPayload & { _id: string, role: string };
        if (!_id) {
          return res.status(403).json({ message: "Token không chứa _id hợp lệ!" });
        }
        
        // Gán _id vào req.user.userId
        req.user = { userId: _id , role: role };
        next(); 
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server khi xác thực token!" });
  }
};


export const verifyRole = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
  };
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
    socket.user = {userId:user._id, role:user.role, restaurant:user?.restaurant};
    
    // Auto join phòng phù hợp
    if (user.role === "customer") {
      socket.join(`user_${user._id}`);
    }
    if (user.role === "staff" && user.restaurantId) {
      socket.join(`restaurant_${user.restaurantId}`);
    }

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return next(new Error("Invalid or expired token"));
  }
};
import type { Model } from 'mongoose';
import { User } from './Schema/UserSchema.js';
import { Restaurant } from './Schema/RestaurantSchema.js';
import { Table } from './Schema/TableSchema.js';
import { MenuCategory } from './Schema/MenuCategorySchema.js';
import { Reservation } from './Schema/ReservationSchema.js';
import { Order } from './Schema/OrderSchema.js';
import { OrderItem } from './Schema/OrderItemSchema.js';
import { AuditLog } from './Schema/AuditLogSchema.js';
import { Notification } from './Schema/NotificationSchema.js';
import { Payment } from './Schema/PaymentSchema.js';
import { MenuItem } from './Schema/MenuItemSchema.js';
import { Setting } from './Schema/SettingSchema.js';

interface IDBConnection {
  User: Model<any>;
  Restaurant: Model<any>;
  Table: Model<any>;
  MenuCategory: Model<any>;
  Reservation: Model<any>;
  Order: Model<any>;
  OrderItem: Model<any>;
  AuditLog: Model<any>;
  Notification: Model<any>;
  Payment: Model<any>;
  MenuItem: Model<any>;
  Setting: Model<any>;
}

const DB_Connection: IDBConnection = {
  User: User,
  Restaurant: Restaurant,
  Table: Table,
  MenuCategory: MenuCategory,
  Reservation: Reservation,
  Order: Order,
  OrderItem: OrderItem,
  AuditLog: AuditLog,
  Notification: Notification,
  Payment: Payment,
  MenuItem: MenuItem,
  Setting: Setting,
};

export default DB_Connection;

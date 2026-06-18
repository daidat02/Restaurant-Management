import DB_Connection from '../../models/DB_Connection.js';
import type { ITable, ITableDocument } from '../../models/Schema/TableSchema.js';
import type { ClientSession, FilterQuery } from 'mongoose';

class TableRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho Table)
  // ==========================================

  /**
   * Tạo mới một bàn ăn trong hệ thống
   */
  async createTable(
    tableData: Partial<ITable>,
    options?: { session: ClientSession },
  ): Promise<ITableDocument> {
    const table = new DB_Connection.Table({ ...tableData });
    return await table.save(options);
  }

  /**
   * Tìm nhanh một Table bằng ID (Không populate)
   */
  async findTableById(id: string): Promise<ITableDocument | null> {
    return await DB_Connection.Table.findById(id).exec();
  }

  /**
   * Cập nhật thông tin chi tiết hoặc trạng thái bàn ăn
   * FIX: Loại bỏ việc gọi .save() sau findByIdAndUpdate gây lỗi và chậm hệ thống
   */
  async updateTable(
    id: string,
    tableData: Partial<ITable>,
    options?: { session?: ClientSession },
  ): Promise<ITableDocument | null> {
    return await DB_Connection.Table.findByIdAndUpdate(id, tableData, {
      new: true,
      session: options?.session ?? null,
    }).exec();
  }

  /**
   * Xóa bàn ăn khỏi hệ thống
   */
  async deleteTable(id: string): Promise<ITableDocument | null> {
    return await DB_Connection.Table.findByIdAndDelete(id).exec();
  }

  // ==========================================
  // II. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query tổng lực: Tìm kiếm danh sách Bàn linh hoạt theo mọi bộ lọc (Filter)
   * Thay thế hoàn toàn cho: findTablesByRestaurant, findTablesAvailable
   */
  async findTables(filter: FilterQuery<ITableDocument>): Promise<ITableDocument[]> {
    return await DB_Connection.Table.find(filter)
      .populate([{ path: 'currentOrder', select: 'orderId totalAmount' }])
      .sort({ tableNumber: 1 }) // Ưu tiên xếp từ bàn nhỏ đến bàn lớn
      .exec();
  }
}

export default new TableRepository();

import type { ITable } from '../../models/Schema/TableSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import tableRepository from './table.repository.js';

class TableService {
  async createTableService(tableData: Partial<ITable>): Promise<ServiceResponse<ITable>> {
    const tables = await tableRepository.findTables({
      restaurant: tableData.restaurant,
      tableNumber: tableData.tableNumber,
    });

    if (tables.length > 0) {
      return { code: 400, message: `Bàn số ${tableData.tableNumber} đã tồn tại` };
    }
    const newTable = await tableRepository.createTable(tableData);
    return { code: 201, message: 'Thêm một bàn mới thành công', data: newTable };
  }

  async findTableByIdService(id: string): Promise<ServiceResponse<ITable>> {
    const table = await tableRepository.findTableById(id);
    if (!table) {
      return { code: 404, message: 'Bàn không tồn tại' };
    }
    return { code: 200, message: 'Lấy thông tin bàn thành công', data: table };
  }

  async updateTableService(id: string, tableData: ITable): Promise<ServiceResponse<ITable>> {
    const existingTable = await tableRepository.findTableById(id);
    if (!existingTable) {
      return { code: 404, message: 'Bàn không tồn tại' };
    }
    const updatedTable = await tableRepository.updateTable(id, tableData);
    console.log(updatedTable);

    return {
      code: 200,
      message: 'Cập nhật thông tin bàn thành công',
      data: updatedTable as ITable,
    };
  }

  async deleteTableService(id: string): Promise<ServiceResponse<null>> {
    const existingTable = await tableRepository.findTableById(id);
    if (!existingTable) {
      return { code: 404, message: 'Bàn không tồn tại' };
    }
    await tableRepository.deleteTable(id);
    return { code: 200, message: 'Xóa bàn thành công' };
  }

  async findTablesByRestaurantService(restaurantId: string): Promise<ServiceResponse<ITable[]>> {
    const tables = await tableRepository.findTables({ restaurant: restaurantId });
    return { code: 200, message: 'Lấy danh sách bàn thành công', data: tables };
  }

  async updateTableStatusService(
    id: string,
    status: ITable['status'],
  ): Promise<ServiceResponse<ITable>> {
    const existingTable = await tableRepository.findTableById(id);

    // 1. Kiểm tra bàn tồn tại
    if (!existingTable) {
      return { code: 404, message: 'Bàn không tồn tại' };
    }

    // 2. Tối ưu: Nếu trạng thái gửi lên giống hệt trạng thái hiện tại -> Bỏ qua
    if (existingTable.status === status) {
      return { code: 200, message: 'Trạng thái không thay đổi', data: existingTable as ITable };
    }

    // 3. Kiểm tra bàn có đang gắn với đơn hàng không (Đã bỏ dấu ?)
    if (existingTable.currentOrder) {
      return { code: 400, message: 'Bàn đang được phục vụ, vui lòng thanh toán để cập nhật' };
    }

    // 4. Thực hiện cập nhật
    const updatedTable = await tableRepository.updateTable(id, { status });
    return {
      code: 200,
      message: 'Cập nhật trạng thái bàn thành công',
      data: updatedTable as ITable,
    };
  }
}

export default TableService;

import ExcelJS from 'exceljs';
import type { IOrderPopulate } from '../../models/Schema/OrderSchema.js';

/** Bỏ dấu tiếng Việt + ký tự không an toàn cho tên file (mirror analytic export). */
function sanitizeFileName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle' };
  });
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  'dine-in': 'Tại bàn',
  delivery: 'Giao hàng',
  'to-go': 'Mang đi',
};

/**
 * Dựng file Excel danh sách đơn hàng cho trang Quản Lý Đơn Hàng —
 * toàn bộ kết quả khớp filter (mọi trang phân trang).
 */
class OrderExportService {
  async buildWorkbook(orders: IOrderPopulate[]): Promise<{ buffer: ExcelJS.Buffer; fileName: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NhaHang OS';
    const sheet = workbook.addWorksheet('Đơn hàng');

    sheet.columns = [
      { header: 'Mã đơn', key: 'orderId', width: 18 },
      { header: 'Loại đơn', key: 'orderType', width: 14 },
      { header: 'Bàn / Khách', key: 'tableOrGuest', width: 24 },
      { header: 'Tổng tiền', key: 'totalAmount', width: 16, style: { numFmt: '#,##0' } },
      { header: 'Trạng thái đơn', key: 'status', width: 16 },
      { header: 'Thanh toán', key: 'paymentStatus', width: 16 },
      { header: 'Thời gian tạo', key: 'createdAt', width: 22 },
    ];
    styleHeader(sheet.getRow(1));

    orders.forEach((order) => {
      const tableNumber = (order.table as { tableNumber?: number } | null)?.tableNumber;
      const guestName =
        order.deliveryInfo?.name ||
        ((order.customer as { name?: string } | null)?.name ?? '');
      sheet.addRow({
        orderId: order.orderId || String(order._id ?? ''),
        orderType: ORDER_TYPE_LABELS[order.orderType as string] || order.orderType,
        tableOrGuest: tableNumber ? `Bàn ${tableNumber}` : guestName || 'Khách lẻ',
        totalAmount: order.totalAmount ?? 0,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    // Sanitize CHỈ phần tên — giữ nguyên đuôi .xlsx (sanitize cũ xoá cả dấu chấm → mất extension)
    const fileName = `${sanitizeFileName(`don-hang-${new Date().toISOString().slice(0, 10)}`)}.xlsx`;
    return { buffer, fileName };
  }
}

export default new OrderExportService();

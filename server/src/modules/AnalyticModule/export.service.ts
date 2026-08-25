import ExcelJS from 'exceljs';
import DB_Connection from '../../models/DB_Connection.js';
import analyticService from './analytic.service.js';

/** Bỏ dấu tiếng Việt + ký tự không an toàn cho tên file. */
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

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

/** Header row đậm + nền xám nhạt. */
function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle' };
  });
}

const MONEY_FORMAT = '#,##0';

class AnalyticExportService {
  /**
   * GET /analytics/export — sinh file .xlsx 4 sheet khớp nội dung trang báo cáo nâng cao.
   * Số liệu TÁI DỤNG đúng hàm aggregate của các API (overview/branches/channels/hour-matrix)
   * để biểu đồ và Excel không lệch số.
   */
  async buildWorkbook(startDate: Date, endDate: Date, restaurantIds: string[]) {
    // ── Gom dữ liệu song song từ các service báo cáo hiện có ──
    const [overview, branches, channels, hourMatrix] = await Promise.all([
      analyticService.getOverviewStats(startDate, endDate, restaurantIds),
      analyticService.getBranchRevenueByIdsService(startDate, endDate, restaurantIds),
      analyticService.getOrderChannelAnalytics(startDate, endDate, restaurantIds),
      analyticService.getHourMatrix(startDate, endDate, restaurantIds),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NhaHang OS';
    workbook.created = new Date();

    this.addOverviewSheet(workbook, overview);
    this.addBranchSheet(workbook, branches);
    this.addChannelSheet(workbook, channels);
    this.addHourMatrixSheet(workbook, hourMatrix as any[]);

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, fileName: await this.buildFileName(startDate, endDate, restaurantIds) };
  }

  private async buildFileName(startDate: Date, endDate: Date, restaurantIds: string[]) {
    let baseName = 'NhaHang-OS';
    if (restaurantIds.length > 0) {
      if (restaurantIds.length === 1) {
        const r = await DB_Connection.Restaurant.findById(restaurantIds[0]).lean<{ name?: string }>();
        if (r?.name) baseName = r.name;
      } else {
        baseName = `${restaurantIds.length}-chi-nhanh`;
      }
    }
    return `${sanitizeFileName(baseName)}-bao-cao-${fmtDate(startDate)}_${fmtDate(endDate)}.xlsx`;
  }

  /** Sheet 1 — Tổng quan: KPI kỳ này + growth so kỳ trước. */
  private addOverviewSheet(workbook: ExcelJS.Workbook, o: any) {
    const ws = workbook.addWorksheet('Tổng quan');
    ws.columns = [{ width: 34 }, { width: 18 }, { width: 22 }];

    ws.addRow(['BÁO CÁO KINH DOANH — TỔNG QUAN']).font = { bold: true, size: 13 };
    ws.addRow([]);

    ws.addRow(['Chỉ số', 'Giá trị', 'Tăng trưởng so kỳ trước (%)']);
    styleHeader(ws.getRow(ws.rowCount));

    const rows: [string, number, string | number][] = [
      ['Doanh thu', o.totalRevenue, o.growth.revenue],
      ['Tổng số đơn', o.totalOrders, o.growth.orders],
      ['Đơn trung bình (AOV)', o.averagePerOrder, o.growth.averagePerOrder],
      ['Đơn huỷ', o.cancelledOrders, ''],
      ['Tỷ lệ huỷ (%)', o.cancellationRate, ''],
      ['Lượt đặt bàn', o.totalReservations, ''],
    ];
    for (const [label, value, growth] of rows) {
      const row = ws.addRow([label, value, growth]);
      if (typeof value === 'number' && label !== 'Tỷ lệ huỷ (%)') {
        row.getCell(2).numFmt = MONEY_FORMAT;
      }
    }
    return ws;
  }

  /** Sheet 2 — Chi nhánh: doanh thu / đơn / AOV từng nhà hàng. */
  private addBranchSheet(workbook: ExcelJS.Workbook, branches: any[]) {
    const ws = workbook.addWorksheet('Chi nhánh');
    ws.columns = [{ width: 32 }, { width: 16 }, { width: 12 }, { width: 16 }];

    ws.addRow(['Chi nhánh', 'Doanh thu', 'Số đơn', 'Đơn trung bình']);
    styleHeader(ws.getRow(1));

    for (const b of branches) {
      const row = ws.addRow([b.branchName, b.revenue, b.orderCount, b.averageBill]);
      row.getCell(2).numFmt = MONEY_FORMAT;
      row.getCell(4).numFmt = MONEY_FORMAT;
    }
    return ws;
  }

  /** Sheet 3 — Kênh đơn: số đơn/% và doanh thu/% doanh thu theo 4 kênh. */
  private addChannelSheet(workbook: ExcelJS.Workbook, channels: any[]) {
    const ws = workbook.addWorksheet('Kênh đơn');
    ws.columns = [
      { width: 24 },
      { width: 12 },
      { width: 14 },
      { width: 16 },
      { width: 18 },
    ];

    ws.addRow([
      'Kênh',
      'Số đơn',
      '% số đơn',
      'Doanh thu',
      '% doanh thu',
    ]);
    styleHeader(ws.getRow(1));

    for (const c of channels) {
      const row = ws.addRow([
        c.channel,
        c.count,
        c.percentage,
        c.revenue,
        c.revenuePercentage,
      ]);
      row.getCell(4).numFmt = MONEY_FORMAT;
    }
    return ws;
  }

  /** Sheet 4 — Ma trận giờ: 7 thứ × giờ, doanh thu + số đơn mỗi ô. */
  private addHourMatrixSheet(workbook: ExcelJS.Workbook, cells: any[]) {
    const ws = workbook.addWorksheet('Ma trận giờ');

    const DOW_LABELS: Record<number, string> = {
      1: 'Chủ nhật', 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
      5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7',
    };

    const lookup = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));

    ws.addRow(['Thứ', 'Giờ', 'Doanh thu', 'Số đơn']);
    styleHeader(ws.getRow(1));

    for (let dow = 1; dow <= 7; dow += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const cell = lookup.get(`${dow}-${hour}`);
        if (!cell) continue; // chỉ liệt kê ô có dữ liệu cho gọn file
        const row = ws.addRow([DOW_LABELS[dow], `${hour}:00`, cell.revenue, cell.orderCount]);
        row.getCell(3).numFmt = MONEY_FORMAT;
      }
    }
    return ws;
  }
}

export default new AnalyticExportService();

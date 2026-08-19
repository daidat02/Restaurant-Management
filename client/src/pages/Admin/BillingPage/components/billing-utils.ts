import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
export const fmtDate = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi });
export const fmtTime = (d: Date | string) => format(new Date(d), 'HH:mm', { locale: vi });
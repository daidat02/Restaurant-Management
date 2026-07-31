// Tiện ích quản lý phiên nhà bếp (KDS): token nhẹ 8 giờ lưu cục bộ
export interface KdsSession {
  token: string;
  restaurantId: string;
  restaurantName: string;
  expiresAt: number;
}

const KDS_SESSION_KEY = 'kds_session';
const KDS_SESSION_TTL = 8 * 60 * 60 * 1000; // 8 giờ

export const getKdsSession = (): KdsSession | null => {
  try {
    const raw = localStorage.getItem(KDS_SESSION_KEY);
    return raw ? (JSON.parse(raw) as KdsSession) : null;
  } catch {
    return null;
  }
};

export const setKdsSession = (data: {
  token: string;
  restaurantId: string;
  restaurantName: string;
}): KdsSession => {
  const session: KdsSession = {
    ...data,
    expiresAt: Date.now() + KDS_SESSION_TTL,
  };
  localStorage.setItem(KDS_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const clearKdsSession = (): void => {
  localStorage.removeItem(KDS_SESSION_KEY);
};

export const isKdsSessionValid = (session: KdsSession | null): boolean => {
  return !!session && session.expiresAt > Date.now();
};

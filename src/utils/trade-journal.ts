import AsyncStorage from '@react-native-async-storage/async-storage';

export type Trade = {
  id: string;
  date: string;
  name: string;
  position: string;
  leverage: string;
  entry: string;
  entryTime: string;
  exit: string;
  exitTime: string;
  outcome: string;
  tp: string;
  pnl: string;
  notes: string;
};

export const STORAGE_KEY = 'trade-journal-trades-v1';

export const isValidDateString = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());

export const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todayKey = () => toDateString(new Date());

export const getWeekday = (date: string) => {
  if (!isValidDateString(date)) return 'Choose a valid date';
  const dt = new Date(`${date}T12:00:00`);
  return dt.toLocaleDateString('en-IN', { weekday: 'long' });
};

export const formatMoney = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}₹${Math.abs(value).toFixed(2)}`;
};

export const safeNumber = (value: string | number | undefined | null) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const parseTimeValue = (value?: string): Date | null => {
  if (!value || typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  const meridianMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridianMatch) {
    const hours = Number(meridianMatch[1]);
    const minutes = Number(meridianMatch[2]);
    const period = meridianMatch[3].toUpperCase();

    if (minutes < 0 || minutes > 59 || hours < 1 || hours > 12) return null;

    const normalizedHours = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
    const date = new Date(2000, 0, 1, normalizedHours, minutes);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const plainMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (plainMatch) {
    const hours = Number(plainMatch[1]);
    const minutes = Number(plainMatch[2]);
    if (minutes < 0 || minutes > 59 || hours < 0 || hours > 23) return null;

    const date = new Date(2000, 0, 1, hours, minutes);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const formatTimeDisplay = (value?: string) => {
  const parsed = parseTimeValue(value);
  if (!parsed) return '—';

  const hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const formatTimeForStorage = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getTimePickerValue = (value?: string) => {
  const parsed = parseTimeValue(value);
  if (parsed) {
    return parsed;
  }

  const fallback = new Date();
  return new Date(2000, 0, 1, fallback.getHours(), fallback.getMinutes());
};

export const normalizeTrade = (item: Record<string, any>, index: number): Trade | null => {
  const date = typeof item?.date === 'string' && item.date.trim() ? item.date.trim() : todayKey();
  const name = typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : `Trade ${index + 1}`;
  const position = item?.position === 'SHORT' ? 'SHORT' : 'LONG';
  const leverage = String(item?.leverage ?? '1');
  const entry = String(item?.entry ?? '');
  const exit = String(item?.exit ?? '');
  const entryTime = typeof item?.entryTime === 'string' && item.entryTime ? item.entryTime : '09:30';
  const exitTime = typeof item?.exitTime === 'string' && item.exitTime ? item.exitTime : '10:00';
  const outcome = ['Profit', 'Loss', 'Break even'].includes(item?.outcome) ? item.outcome : 'Profit';
  const tp = typeof item?.tp === 'string' && item.tp ? item.tp : 'No TP';
  const pnl = String(item?.pnl ?? '');
  const notes = typeof item?.notes === 'string' ? item.notes : '';

  return {
    id: String(item?.id ?? `${Date.now()}-${index}`),
    date,
    name,
    position,
    leverage,
    entry,
    entryTime,
    exit,
    exitTime,
    outcome,
    tp,
    pnl,
    notes,
  };
};

export const normalizeStoredTrades = (raw: unknown): Trade[] => {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<Trade[]>((acc, item, index) => {
    if (item && typeof item === 'object') {
      const normalized = normalizeTrade(item as Record<string, any>, index);
      if (normalized) acc.push(normalized);
    }
    return acc;
  }, []);
};

export const loadTradesFromStorage = async (): Promise<Trade[]> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return normalizeStoredTrades(parsed);
  } catch {
    return [];
  }
};

export const saveTradesToStorage = async (trades: Trade[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
};

export const filterTradesByDate = (trades: Trade[], date: string) =>
  trades.filter((trade) => trade.date === date);

export const groupTradesByDate = (trades: Trade[]) => {
  const grouped = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    const list = grouped.get(trade.date) ?? [];
    list.push(trade);
    grouped.set(trade.date, list);
  });

  return Array.from(grouped.entries())
    .map(([date, tradeList]) => ({ date, trades: tradeList }))
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const getTradeSummary = (trades: Trade[]) => {
  const totalPnl = trades.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0);
  const wins = trades.filter((trade) => trade.outcome === 'Profit').length;
  const losses = trades.filter((trade) => trade.outcome === 'Loss').length;
  const breakEven = trades.filter((trade) => trade.outcome === 'Break even').length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  return {
    totalPnl,
    count: trades.length,
    wins,
    losses,
    breakEven,
    winRate,
  };
};

export const getPerformanceMetrics = (trades: Trade[]) => {
  const allValues = trades.map((trade) => safeNumber(trade.pnl));
  const totalPnl = allValues.reduce((sum, value) => sum + value, 0);

  const profitableTrades = trades.filter((trade) => safeNumber(trade.pnl) > 0);
  const losingTrades = trades.filter((trade) => safeNumber(trade.pnl) < 0);
  const breakEvenTrades = trades.filter((trade) => safeNumber(trade.pnl) === 0);

  const totalWins = profitableTrades.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0));

  const avgWin = profitableTrades.length ? totalWins / profitableTrades.length : 0;
  const avgLoss = losingTrades.length ? totalLosses / losingTrades.length : 0;
  const winRate = trades.length ? (profitableTrades.length / trades.length) * 100 : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

  return {
    totalPnl,
    count: trades.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    wins: profitableTrades.length,
    losses: losingTrades.length,
    breakEven: breakEvenTrades.length,
  };
};

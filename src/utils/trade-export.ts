import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import * as XLSX from 'xlsx';

import { getWeekday, loadTradesFromStorage, safeNumber, Trade } from '@/utils/trade-journal';

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }

  throw new Error('Base64 encoding is not available on this platform.');
};

const normalizeTradePnl = (trade: Trade) => safeNumber(trade.pnl);

const calculateTradeSummary = (trades: Trade[]) => {
  const totalPnl = trades.reduce((sum, trade) => sum + normalizeTradePnl(trade), 0);
  const wins = trades.filter((trade) => trade.outcome === 'Profit').length;
  const losses = trades.filter((trade) => trade.outcome === 'Loss').length;
  const breakEven = trades.filter((trade) => trade.outcome === 'Break even').length;
  const significantTrades = wins + losses;
  const winRate = significantTrades > 0 ? (wins / significantTrades) * 100 : 0;

  return { totalPnl, wins, losses, breakEven, winRate };
};

const createTradeRows = (trades: Trade[]) =>
  trades.map((trade) => ({
    Date: trade.date,
    Weekday: getWeekday(trade.date),
    Trade: trade.name,
    Position: trade.position,
    Leverage: trade.leverage,
    'Entry Price': trade.entry,
    'Entry Time': trade.entryTime,
    'Exit Price': trade.exit,
    'Exit Time': trade.exitTime,
    Outcome: trade.outcome,
    'Take Profit Hit': trade.tp && trade.tp !== 'No TP' ? 'Yes' : 'No',
    'P&L': normalizeTradePnl(trade),
    Notes: trade.notes,
  }));

const createSummaryRows = (trades: Trade[]) => {
  const summary = calculateTradeSummary(trades);

  return [
    { Metric: 'Total trades', Value: trades.length },
    { Metric: 'Total net P&L', Value: summary.totalPnl },
    { Metric: 'Winning trades', Value: summary.wins },
    { Metric: 'Losing trades', Value: summary.losses },
    { Metric: 'Break-even trades', Value: summary.breakEven },
    { Metric: 'Win rate (excluding break-even)', Value: `${summary.winRate.toFixed(1)}%` },
  ];
};

const applyColumnWidths = (sheet: XLSX.WorkSheet, widths: number[]) => {
  sheet['!cols'] = widths.map((width) => ({ wch: width }));
};

export const exportTradesToExcel = async () => {
  const trades = await loadTradesFromStorage();
  const workbook = XLSX.utils.book_new();

  const tradeRows = createTradeRows(trades);
  const tradeSheetRows =
    tradeRows.length > 0
      ? tradeRows
      : [
          {
            Date: '',
            Weekday: '',
            Trade: '',
            Position: '',
            Leverage: '',
            'Entry Price': '',
            'Entry Time': '',
            'Exit Price': '',
            'Exit Time': '',
            Outcome: '',
            'Take Profit Hit': '',
            'P&L': '',
            Notes: '',
          },
        ];

  const tradeSheet = XLSX.utils.json_to_sheet(tradeSheetRows as any);

  applyColumnWidths(tradeSheet, [12, 14, 18, 12, 10, 14, 12, 14, 12, 12, 16, 14, 28]);
  XLSX.utils.book_append_sheet(workbook, tradeSheet, 'Trades');

  const summarySheet = XLSX.utils.json_to_sheet(createSummaryRows(trades) as any);
  applyColumnWidths(summarySheet, [24, 16]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const workbookBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const exportDirectory = `${FileSystem.documentDirectory}exports/`;
  const fileName = `TradeJournal_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const fileUri = `${exportDirectory}${fileName}`;

  await FileSystem.makeDirectoryAsync(exportDirectory, { intermediates: true });

  const bytes = new Uint8Array(workbookBuffer as ArrayBuffer);
  await FileSystem.writeAsStringAsync(fileUri, toBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  await shareAsync(fileUri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: 'Save Trade Journal workbook',
  });

  return { fileUri, fileName };
};

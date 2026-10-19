import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import {
  filterTradesByDate,
  formatMoney,
  getTradeSummary,
  getWeekday,
  loadTradesFromStorage,
  safeNumber,
  todayKey,
  Trade,
} from '@/utils/trade-journal';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const getMonthGrid = (monthDate: Date) => {
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDayOfMonth.getDate()) / 7) * 7;
  const cells: Array<{ date: Date; key: string; inCurrentMonth: boolean }> = [];

  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), index - startOffset + 1);
    cells.push({
      date,
      key: toDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    });
  }

  return cells;
};

export default function CalendarScreen() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const loadData = useCallback(async () => {
    const stored = await loadTradesFromStorage();
    setTrades(stored);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const calendarDays = useMemo(() => getMonthGrid(monthDate), [monthDate]);

  const selectedDayTrades = useMemo(
    () => filterTradesByDate(trades, selectedDate),
    [selectedDate, trades]
  );

  const selectedSummary = useMemo(() => getTradeSummary(selectedDayTrades), [selectedDayTrades]);

  const monthTrades = useMemo(() => {
    const monthKey = monthDate.getMonth();
    const monthYear = monthDate.getFullYear();
    return trades.filter((trade) => {
      const tradeDate = new Date(`${trade.date}T12:00:00`);
      return tradeDate.getMonth() === monthKey && tradeDate.getFullYear() === monthYear;
    });
  }, [monthDate, trades]);

  const monthSummary = useMemo(() => getTradeSummary(monthTrades), [monthTrades]);

  const monthCells = useMemo(() => {
    return calendarDays.map((cell) => {
      const dayTrades = filterTradesByDate(trades, cell.key);
      const daySummary = getTradeSummary(dayTrades);
      const isToday = cell.key === todayKey();
      const isSelected = cell.key === selectedDate;
      const pnlColor = daySummary.totalPnl > 0 ? '#4ade80' : daySummary.totalPnl < 0 ? '#fb7185' : '#dfe9f5';

      return {
        ...cell,
        dayTrades,
        daySummary,
        isToday,
        isSelected,
        pnlColor,
      };
    });
  }, [calendarDays, selectedDate, trades]);

  const handleSelectDate = (key: string, date: Date) => {
    setSelectedDate(key);
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleMonthChange = (offset: number) => {
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    setMonthDate(nextMonth);
    if (selectedDate) {
      const selected = new Date(`${selectedDate}T12:00:00`);
      if (selected.getFullYear() === nextMonth.getFullYear() && selected.getMonth() === nextMonth.getMonth()) {
        setSelectedDate(selectedDate);
      }
    }
  };

  const addTradeForSelectedDate = () => {
    (router.push as any)({
      pathname: '/add-trade',
      params: { date: selectedDate },
    });
  };

  return (
    <ScreenShell title="Trading Calendar">
      <View style={styles.topCard}>
        <View style={styles.monthHeader}>
          <Pressable style={styles.navButton} onPress={() => handleMonthChange(-1)}>
            <Text style={styles.navText}>←</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{getMonthLabel(monthDate)}</Text>
          <Pressable style={styles.navButton} onPress={() => handleMonthChange(1)}>
            <Text style={styles.navText}>→</Text>
          </Pressable>
        </View>

        <View style={styles.monthActions}>
          <Pressable style={styles.todayButton} onPress={() => {
            const today = new Date();
            setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDate(todayKey());
          }}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Monthly summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Trades</Text>
            <Text style={styles.summaryValue}>{monthSummary.count}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net P&L</Text>
            <Text style={[styles.summaryValue, { color: monthSummary.totalPnl >= 0 ? '#4ade80' : '#fb7185' }]}>
              {formatMoney(monthSummary.totalPnl)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Wins</Text>
            <Text style={styles.summaryValue}>{monthSummary.wins}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Losses</Text>
            <Text style={styles.summaryValue}>{monthSummary.losses}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Break-even</Text>
            <Text style={styles.summaryValue}>{monthSummary.breakEven}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Win rate</Text>
            <Text style={styles.summaryValue}>{((monthSummary.wins / Math.max(monthSummary.wins + monthSummary.losses, 1)) * 100).toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {monthCells.map((cell) => {
            const hasTrades = cell.dayTrades.length > 0;
            const pnl = cell.daySummary.totalPnl;
            return (
              <Pressable
                key={cell.key}
                onPress={() => handleSelectDate(cell.key, cell.date)}
                style={[
                  styles.dayCell,
                  !cell.inCurrentMonth && styles.dayCellMuted,
                  cell.isSelected && styles.dayCellSelected,
                  cell.isToday && styles.dayCellToday,
                ]}
              >
                <Text style={[styles.dayNumber, !cell.inCurrentMonth && styles.dayNumberMuted, cell.isSelected && styles.dayNumberSelected]}>
                  {cell.date.getDate()}
                </Text>

                {hasTrades && (
                  <>
                    <Text style={[styles.dayPnl, { color: cell.pnlColor }]}>{formatMoney(pnl)}</Text>
                    <View style={styles.dotRow}>
                      <View style={styles.tradeDot} />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>{getWeekday(selectedDate)} · {selectedDate}</Text>

        {selectedDayTrades.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No trades for this date.</Text>
            <Pressable style={styles.addButton} onPress={addTradeForSelectedDate}>
              <Text style={styles.addButtonText}>Add Trade</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.detailsStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailLabel}>Trades</Text>
                <Text style={styles.detailValue}>{selectedSummary.count}</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailLabel}>P&L</Text>
                <Text style={[styles.detailValue, { color: selectedSummary.totalPnl >= 0 ? '#4ade80' : '#fb7185' }]}>
                  {formatMoney(selectedSummary.totalPnl)}
                </Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailLabel}>Wins</Text>
                <Text style={styles.detailValue}>{selectedSummary.wins}</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailLabel}>Losses</Text>
                <Text style={styles.detailValue}>{selectedSummary.losses}</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailLabel}>Break-even</Text>
                <Text style={styles.detailValue}>{selectedSummary.breakEven}</Text>
              </View>
            </View>

            <View style={styles.tradeList}>
              {selectedDayTrades.map((trade) => {
                const pnlValue = safeNumber(trade.pnl);
                return (
                  <View key={trade.id} style={styles.tradeCard}>
                    <View style={styles.tradeHeader}>
                      <View>
                        <Text style={styles.tradeName}>{trade.name}</Text>
                        <Text style={styles.tradeMeta}>{trade.position} · {trade.leverage}x</Text>
                      </View>
                      <Text style={[styles.tradePnl, { color: pnlValue >= 0 ? '#4ade80' : '#fb7185' }]}>
                        {formatMoney(pnlValue)}
                      </Text>
                    </View>

                    <Text style={styles.tradeText}>Entry: {trade.entry || '—'} @ {trade.entryTime || '—'}</Text>
                    <Text style={styles.tradeText}>Exit: {trade.exit || '—'} @ {trade.exitTime || '—'}</Text>
                    <Text style={styles.tradeText}>Outcome: {trade.outcome} · TP: {trade.tp}</Text>

                    {trade.notes ? <Text style={styles.tradeNotes}>{trade.notes}</Text> : null}

                    <Pressable
                      style={styles.editTradeButton}
                      onPress={() => (router.push as any)({ pathname: '/add-trade', params: { editingId: trade.id } })}
                    >
                      <Text style={styles.editTradeButtonText}>Open & Edit Trade</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: '#22314a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#ebf3ff',
    fontSize: 22,
    fontWeight: '700',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#edf3ff',
    fontSize: 20,
    fontWeight: '800',
  },
  monthActions: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#102a2a',
    borderWidth: 1,
    borderColor: '#1dbf73',
  },
  todayText: {
    color: '#6ee7a0',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  summaryTitle: {
    color: '#edf3ff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: '#243249',
    borderRadius: 12,
    padding: 10,
  },
  summaryLabel: {
    color: '#8a9aad',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#edf3ff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  calendarCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#8a9aad',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: `${100 / 7 - 0.6}%`,
    minHeight: 82,
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: '#223149',
    borderRadius: 10,
    padding: 6,
    justifyContent: 'space-between',
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayCellSelected: {
    borderColor: '#1dbf73',
    backgroundColor: '#102a2a',
  },
  dayCellToday: {
    borderColor: '#7dd3fc',
  },
  dayNumber: {
    color: '#edf3ff',
    fontSize: 13,
    fontWeight: '700',
  },
  dayNumberMuted: {
    color: '#7d8ea3',
  },
  dayNumberSelected: {
    color: '#6ee7a0',
  },
  dayPnl: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'left',
  },
  dotRow: {
    alignItems: 'flex-end',
  },
  tradeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1dbf73',
  },
  detailsCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 14,
  },
  detailsTitle: {
    color: '#edf3ff',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTitle: {
    color: '#dfeaf9',
    fontSize: 14,
    marginBottom: 14,
  },
  addButton: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  addButtonText: {
    color: '#06130b',
    fontWeight: '800',
    fontSize: 14,
  },
  detailsStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  detailStat: {
    width: '31%',
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: '#233149',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  detailLabel: {
    color: '#8a9aad',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#edf3ff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  tradeList: {
    gap: 10,
    marginTop: 12,
  },
  tradeCard: {
    borderWidth: 1,
    borderColor: '#1f2d3d',
    backgroundColor: '#111d2d',
    borderRadius: 12,
    padding: 12,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  tradeName: {
    color: '#edf3ff',
    fontSize: 16,
    fontWeight: '700',
  },
  tradeMeta: {
    color: '#8a9aad',
    fontSize: 11,
    marginTop: 4,
  },
  tradePnl: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  tradeText: {
    color: '#dfeaf9',
    fontSize: 12,
    marginTop: 8,
  },
  tradeNotes: {
    color: '#b9c8da',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  editTradeButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#11243a',
    borderWidth: 1,
    borderColor: '#2a3e58',
  },
  editTradeButtonText: {
    color: '#6ba9ff',
    fontWeight: '700',
    fontSize: 12,
  },
});

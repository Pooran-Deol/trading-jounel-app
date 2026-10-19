import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import {
  filterTradesByDate,
  formatMoney,
  formatTimeDisplay,
  getTradeSummary,
  getWeekday,
  loadTradesFromStorage,
  saveTradesToStorage,
  Trade,
} from '@/utils/trade-journal';

export default function DayDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; highlightId?: string }>();
  const [trades, setTrades] = useState<Trade[]>([]);

  const date = typeof params.date === 'string' ? params.date : '';
  const highlightId = typeof params.highlightId === 'string' ? params.highlightId : null;

  const loadData = useCallback(async () => {
    const stored = await loadTradesFromStorage();
    setTrades(stored);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const dayTrades = filterTradesByDate(trades, date);
  const summary = getTradeSummary(dayTrades);

  const handleDelete = async (tradeId: string) => {
    Alert.alert('Delete trade?', 'This trade will be removed from your local journal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = trades.filter((trade) => trade.id !== tradeId);
          try {
            await saveTradesToStorage(updated);
            setTrades(updated);
            Alert.alert('Trade deleted', 'The selected trade has been removed.');
          } catch {
            Alert.alert('Delete failed', 'Could not delete this trade.');
          }
        },
      },
    ]);
  };

  return (
    <ScreenShell title="Trading Day">
      <View style={styles.summaryCard}>
        <Text style={styles.dateTitle}>{date || 'Unknown date'}</Text>
        <Text style={styles.weekdayText}>{getWeekday(date)}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>P&L</Text>
            <Text style={[styles.statValue, { color: summary.totalPnl >= 0 ? '#4ade80' : '#fb7185' }]}>
              {formatMoney(summary.totalPnl)}
            </Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>Trades</Text>
            <Text style={styles.statValue}>{summary.count}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>Wins</Text>
            <Text style={styles.statValue}>{summary.wins}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>Losses</Text>
            <Text style={styles.statValue}>{summary.losses}</Text>
          </View>
        </View>
      </View>

      {dayTrades.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trades on this date</Text>
        </View>
      ) : (
        <View style={styles.tradeList}>
          {dayTrades.map((trade) => {
            const isActive = highlightId === trade.id;
            const pnlValue = Number(trade.pnl || 0);

            return (
              <View
                key={trade.id}
                style={[styles.tradeCard, isActive && styles.tradeCardActive]}
              >
                <View style={styles.tradeHeader}>
                  <View style={styles.tradeInfo}>
                    <Text style={styles.tradeName}>{trade.name}</Text>
                    <Text style={styles.tradeMeta}>{trade.position} • {trade.leverage}x</Text>
                  </View>
                  <Text style={[styles.pnlText, { color: pnlValue >= 0 ? '#4ade80' : '#fb7185' }]}>
                    {formatMoney(pnlValue)}
                  </Text>
                </View>

                <Text style={styles.tradeLine}>Entry: {trade.entry || '—'} @ {trade.entryTime ? formatTimeDisplay(trade.entryTime) : '—'}</Text>
                <Text style={styles.tradeLine}>Exit: {trade.exit || '—'} @ {trade.exitTime ? formatTimeDisplay(trade.exitTime) : '—'}</Text>
                <Text style={styles.tradeLine}>Outcome: {trade.outcome} • TP: {trade.tp}</Text>

                {trade.notes ? <Text style={styles.notesText}>{trade.notes}</Text> : null}

                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() =>
                      (router.push as any)({
                        pathname: '/add-trade',
                        params: { editingId: trade.id },
                      })
                    }
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(trade.id)}
                  >
                    <Text style={styles.actionTextDanger}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  dateTitle: {
    color: '#edf3ff',
    fontSize: 22,
    fontWeight: '800',
  },
  weekdayText: {
    color: '#93a3ba',
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statMini: {
    flexBasis: '47%',
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: '#233149',
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    color: '#8b9aac',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#0d1723',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1d2a38',
  },
  emptyTitle: {
    color: '#edf3ff',
    fontSize: 17,
    fontWeight: '700',
  },
  tradeList: {
    gap: 12,
  },
  tradeCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1f2d3d',
    borderRadius: 16,
    padding: 16,
  },
  tradeCardActive: {
    borderColor: '#1dbf73',
    backgroundColor: '#0f1e2d',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  tradeInfo: {
    flex: 1,
  },
  tradeName: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '800',
  },
  tradeMeta: {
    color: '#8a9aad',
    fontSize: 12,
    marginTop: 4,
  },
  pnlText: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  tradeLine: {
    color: '#dbe8f6',
    fontSize: 13,
    marginTop: 8,
  },
  notesText: {
    color: '#b9c8da',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#11243a',
    borderWidth: 1,
    borderColor: '#2a3e58',
  },
  deleteButton: {
    backgroundColor: '#2a121b',
    borderColor: '#5d1e2d',
  },
  actionText: {
    color: '#6ba9ff',
    fontWeight: '700',
  },
  actionTextDanger: {
    color: '#ff8fa3',
    fontWeight: '700',
  },
});

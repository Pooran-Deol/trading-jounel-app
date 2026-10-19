import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import {
  filterTradesByDate,
  formatMoney,
  getTradeSummary,
  getWeekday,
  loadTradesFromStorage,
  todayKey,
  Trade,
} from '@/utils/trade-journal';

export default function HomeScreen() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);

  const loadData = useCallback(async () => {
    setTrades(await loadTradesFromStorage());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const dateKey = todayKey();
  const todayTrades = filterTradesByDate(trades, dateKey);
  const summary = getTradeSummary(todayTrades);

  return (
    <ScreenShell title="Dashboard">
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Today</Text>
        <Text style={styles.dateText}>{dateKey}</Text>
        <Text style={styles.weekdayText}>{getWeekday(dateKey)}</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total P&L</Text>
            <Text style={[styles.metricValue, { color: summary.totalPnl >= 0 ? '#4ade80' : '#fb7185' }]}>
              {formatMoney(summary.totalPnl)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Trades</Text>
            <Text style={styles.metricValue}>{summary.count}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Wins</Text>
            <Text style={styles.metricValue}>{summary.wins}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Losses</Text>
            <Text style={styles.metricValue}>{summary.losses}</Text>
          </View>
          <View style={[styles.metricCard, styles.fullWidthCard]}>
            <Text style={styles.metricLabel}>Win Rate</Text>
            <Text style={styles.metricValue}>{summary.winRate.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => (router.push as any)('/add-trade')}>
        <Text style={styles.primaryButtonText}>+ Add Trade</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today’s trades</Text>
      </View>

      {todayTrades.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trades recorded today</Text>
          <Text style={styles.emptyText}>Your daily snapshot will show up here once you log a trade.</Text>
        </View>
      ) : (
        <View style={styles.tradeList}>
          {todayTrades.map((trade) => {
            const pnlValue = Number(trade.pnl || 0);
            return (
              <Pressable
                key={trade.id}
                onPress={() =>
                  (router.push as any)({
                    pathname: '/day-details',
                    params: { date: trade.date, highlightId: trade.id },
                  })
                }
                style={styles.tradeCard}
              >
                <View style={styles.tradeHeader}>
                  <View style={styles.tradeHeaderText}>
                    <Text style={styles.tradeName}>{trade.name}</Text>
                    <Text style={styles.tradeMeta}>{trade.position} • {trade.leverage}x</Text>
                  </View>
                  <Text style={[styles.pnlText, { color: pnlValue >= 0 ? '#4ade80' : '#fb7185' }]}>
                    {formatMoney(pnlValue)}
                  </Text>
                </View>

                <Text style={styles.tradeDetails}>Entry: {trade.entry || '—'} • Exit: {trade.exit || '—'}</Text>
                <Text style={styles.tradeDetails}>Outcome: {trade.outcome} • TP: {trade.tp}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 16,
  },
  heroEyebrow: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dateText: {
    color: '#edf3ff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  weekdayText: {
    color: '#8d9cb0',
    fontSize: 12,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#111d2d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233149',
    padding: 12,
  },
  fullWidthCard: {
    width: '100%',
  },
  metricLabel: {
    color: '#8b9aac',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#edf3ff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#06130b',
    fontWeight: '800',
    fontSize: 15,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#90a2b9',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  tradeList: {
    gap: 12,
  },
  tradeCard: {
    backgroundColor: '#0d1723',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2a38',
    padding: 14,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  tradeHeaderText: {
    flex: 1,
  },
  tradeName: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '800',
  },
  tradeMeta: {
    color: '#8b9aac',
    fontSize: 12,
    marginTop: 4,
  },
  pnlText: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  tradeDetails: {
    color: '#dfeaf9',
    fontSize: 12,
    marginTop: 8,
  },
});

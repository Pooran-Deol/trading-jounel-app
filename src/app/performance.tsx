import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import {
  formatMoney,
  getPerformanceMetrics,
  loadTradesFromStorage,
  Trade,
} from '@/utils/trade-journal';

export default function PerformanceScreen() {
  const [trades, setTrades] = useState<Trade[]>([]);

  const loadData = useCallback(async () => {
    setTrades(await loadTradesFromStorage());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const metrics = getPerformanceMetrics(trades);

  return (
    <ScreenShell title="Performance">
      {trades.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No performance data yet</Text>
          <Text style={styles.emptyText}>Save a few trades to start seeing your totals and trends.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total P&L</Text>
              <Text style={[styles.metricValue, { color: metrics.totalPnl >= 0 ? '#4ade80' : '#fb7185' }]}>
                {formatMoney(metrics.totalPnl)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Trades</Text>
              <Text style={styles.metricValue}>{metrics.count}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Win rate</Text>
              <Text style={styles.metricValue}>{metrics.winRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Profit factor</Text>
              <Text style={styles.metricValue}>{Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '0.00'}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg win</Text>
              <Text style={[styles.metricValue, { color: '#4ade80' }]}>{formatMoney(metrics.avgWin)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg loss</Text>
              <Text style={[styles.metricValue, { color: '#fb7185' }]}>{formatMoney(metrics.avgLoss)}</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Trade outcomes</Text>
            <View style={styles.barGroup}>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Wins</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max((metrics.wins / Math.max(metrics.count, 1)) * 100, 8)}%`, backgroundColor: '#22c55e' }]} />
                </View>
                <Text style={styles.barCount}>{metrics.wins}</Text>
              </View>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Losses</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max((metrics.losses / Math.max(metrics.count, 1)) * 100, 8)}%`, backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={styles.barCount}>{metrics.losses}</Text>
              </View>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Break even</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max((metrics.breakEven / Math.max(metrics.count, 1)) * 100, 8)}%`, backgroundColor: '#fbbf24' }]} />
                </View>
                <Text style={styles.barCount}>{metrics.breakEven}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 22,
  },
  emptyTitle: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#90a2b9',
    marginTop: 8,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0d1723',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2a38',
    padding: 14,
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
    marginTop: 10,
  },
  chartCard: {
    backgroundColor: '#0d1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  chartTitle: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  barGroup: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 86,
    color: '#dfeaf9',
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#121f2d',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#233349',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barCount: {
    color: '#edf3ff',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
});

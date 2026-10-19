import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';

export default function SettingsScreen() {
  return (
    <ScreenShell title="Settings">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Local data</Text>
        <Text style={styles.text}>Your trade journal is stored locally on this Android device using AsyncStorage.</Text>
        <Text style={styles.text}>No broker connection, cloud service, or external sync is enabled.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>App behavior</Text>
        <Text style={styles.text}>• Home dashboard focuses on today’s results.</Text>
        <Text style={styles.text}>• All trading days page lists all saved dates and totals.</Text>
        <Text style={styles.text}>• Performance page summarizes long-term results based on your manual P&L values.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0d1723',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1d2a38',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#edf3ff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  text: {
    color: '#d4dff0',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 4,
  },
});

import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import {
  formatTimeDisplay,
  formatTimeForStorage,
  getTimePickerValue,
  getWeekday,
  isValidDateString,
  loadTradesFromStorage,
  saveTradesToStorage,
  todayKey,
  Trade,
} from '@/utils/trade-journal';

const DEFAULT_FORM = {
  date: todayKey(),
  name: '',
  position: 'LONG',
  leverage: '1',
  entry: '',
  entryTime: formatTimeForStorage(new Date()),
  exit: '',
  exitTime: '',
  outcome: 'Profit',
  tp: 'No TP',
  pnl: '',
  notes: '',
};

type TradeForm = typeof DEFAULT_FORM;

export default function AddTradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editingId?: string; date?: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState<TradeForm>({
    ...DEFAULT_FORM,
    date: typeof params.date === 'string' ? params.date : DEFAULT_FORM.date,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEntryTimePicker, setShowEntryTimePicker] = useState(false);
  const [showExitTimePicker, setShowExitTimePicker] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const stored = await loadTradesFromStorage();
    setTrades(stored);

    const editingIdFromParam = typeof params.editingId === 'string' ? params.editingId : null;
    if (editingIdFromParam) {
      const found = stored.find((trade) => trade.id === editingIdFromParam) ?? null;
      if (found) {
        setEditingId(found.id);
        setForm({
          date: found.date,
          name: found.name,
          position: found.position,
          leverage: found.leverage,
          entry: found.entry,
          entryTime: found.entryTime,
          exit: found.exit,
          exitTime: found.exitTime,
          outcome: found.outcome,
          tp: found.tp,
          pnl: found.pnl,
          notes: found.notes,
        });
        return;
      }
    }

    setEditingId(null);
    setForm({
      ...DEFAULT_FORM,
      date: typeof params.date === 'string' ? params.date : DEFAULT_FORM.date,
    });
  }, [params.date, params.editingId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const suggestions = useMemo(() => {
    const names = Array.from(new Set(trades.map((trade) => trade.name))).filter(Boolean);
    const search = form.name.trim().toLowerCase();
    if (!search) return names.slice(0, 6);
    return names.filter((name) => name.toLowerCase().includes(search)).slice(0, 6);
  }, [form.name, trades]);

  const updateField = <K extends keyof TradeForm>(field: K, value: TradeForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!form.name.trim()) {
      Alert.alert('Missing trade name', 'Please enter a trade name before saving.');
      return;
    }
    if (!isValidDateString(form.date)) {
      Alert.alert('Invalid date', 'Please select a valid trading date.');
      return;
    }
    if (form.pnl.trim() && !Number.isFinite(Number(form.pnl))) {
      Alert.alert('Invalid P&L', 'Profit or loss must be a valid number.');
      return;
    }

    setIsSaving(true);

    const savedTrade: Trade = {
      id: editingId ?? `${Date.now()}`,
      date: form.date,
      name: form.name.trim(),
      position: form.position,
      leverage: form.leverage,
      entry: form.entry,
      entryTime: form.entryTime,
      exit: form.exit,
      exitTime: form.exitTime,
      outcome: form.outcome,
      tp: form.tp,
      pnl: form.pnl,
      notes: form.notes,
    };

    let updatedTrades: Trade[] = [];
    if (editingId) {
      updatedTrades = trades.map((trade) => (trade.id === editingId ? savedTrade : trade));
    } else {
      updatedTrades = [savedTrade, ...trades];
    }

    try {
      await saveTradesToStorage(updatedTrades);
      setTrades(updatedTrades);
      Alert.alert(editingId ? 'Trade updated' : 'Trade saved', 'Your journal entry is now stored locally on this device.');
      router.back();
    } catch {
      Alert.alert('Save failed', 'Could not save your trade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;

    Alert.alert('Delete this trade?', 'This trade will be removed from your local journal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const nextTrades = trades.filter((trade) => trade.id !== editingId);
          try {
            await saveTradesToStorage(nextTrades);
            setTrades(nextTrades);
            Alert.alert('Trade deleted', 'The trade was removed successfully.');
            router.back();
          } catch {
            Alert.alert('Delete failed', 'Could not delete this trade.');
          }
        },
      },
    ]);
  };

  const positionOptions = ['LONG', 'SHORT'];
  const outcomeOptions = ['Profit', 'Loss', 'Break even'];
  const tpOptions = ['No TP', 'TP1', 'TP2', 'TP3', 'TP4'];

  return (
    <ScreenShell title={editingId ? 'Edit Trade' : 'Add Trade'}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.fieldLabel}>Trade date</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.9}
          >
            <Text style={styles.selectText}>{form.date}</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>Weekday: {getWeekday(form.date)}</Text>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(`${form.date}T12:00:00`)}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate && event.type !== 'dismissed') {
                  const nextDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                  updateField('date', nextDate);
                }
              }}
            />
          )}

          <Text style={styles.fieldLabel}>Trade name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => {
              updateField('name', value);
              setShowSuggestions(true);
            }}
            placeholder="e.g. NIFTY 50, BTCUSDT"
            placeholderTextColor="#77839a"
          />

          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestionRow}
                  onPress={() => {
                    updateField('name', suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Position</Text>
            <View style={styles.chipRow}>
              {positionOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => updateField('position', item)}
                  style={[styles.chip, form.position === item && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, form.position === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.fieldLabel}>Leverage</Text>
          <TextInput
            style={styles.input}
            value={form.leverage}
            onChangeText={(value) => updateField('leverage', value)}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor="#77839a"
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.columnCell}>
              <Text style={styles.fieldLabel}>Entry price</Text>
              <TextInput
                style={styles.input}
                value={form.entry}
                onChangeText={(value) => updateField('entry', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#77839a"
              />
            </View>
            <View style={styles.columnCell}>
              <Text style={styles.fieldLabel}>Entry time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEntryTimePicker(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.selectText}>{formatTimeDisplay(form.entryTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEntryTimePicker && (
            <DateTimePicker
              value={getTimePickerValue(form.entryTime)}
              mode="time"
              display="spinner"
              onChange={(event, selected) => {
                setShowEntryTimePicker(false);
                if (selected && event.type !== 'dismissed') {
                  updateField('entryTime', formatTimeForStorage(selected));
                }
              }}
            />
          )}

          <View style={styles.twoColumnRow}>
            <View style={styles.columnCell}>
              <Text style={styles.fieldLabel}>Exit price</Text>
              <TextInput
                style={styles.input}
                value={form.exit}
                onChangeText={(value) => updateField('exit', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#77839a"
              />
            </View>
            <View style={styles.columnCell}>
              <Text style={styles.fieldLabel}>Exit time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowExitTimePicker(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.selectText}>{form.exitTime ? formatTimeDisplay(form.exitTime) : 'Select time'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showExitTimePicker && (
            <DateTimePicker
              value={getTimePickerValue(form.exitTime || form.entryTime)}
              mode="time"
              display="spinner"
              onChange={(event, selected) => {
                setShowExitTimePicker(false);
                if (selected && event.type !== 'dismissed') {
                  updateField('exitTime', formatTimeForStorage(selected));
                }
              }}
            />
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Outcome</Text>
            <View style={styles.chipRow}>
              {outcomeOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => updateField('outcome', item)}
                  style={[styles.chip, form.outcome === item && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, form.outcome === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Take-profit hit</Text>
            <View style={styles.chipRow}>
              {tpOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => updateField('tp', item)}
                  style={[styles.chip, form.tp === item && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, form.tp === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.fieldLabel}>P&L (₹)</Text>
          <TextInput
            style={styles.input}
            value={form.pnl}
            onChangeText={(value) => updateField('pnl', value)}
            keyboardType="numbers-and-punctuation"
            placeholder="500 or -250"
            placeholderTextColor="#77839a"
          />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={form.notes}
            onChangeText={(value) => updateField('notes', value)}
            placeholder="Setup, emotions, lessons and mistakes..."
            placeholderTextColor="#77839a"
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : editingId ? 'Update Trade' : 'Save Trade'}</Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDelete} activeOpacity={0.9}>
              <Text style={styles.secondaryButtonText}>Delete Trade</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#0e1723',
    borderWidth: 1,
    borderColor: '#1d2a38',
    borderRadius: 18,
    padding: 16,
  },
  fieldLabel: {
    color: '#aab8c8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: '#2a3b4d',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#edf5ff',
    fontSize: 15,
  },
  notesInput: {
    minHeight: 100,
  },
  selectButton: {
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: '#2a3b4d',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: {
    color: '#edf5ff',
    fontSize: 15,
  },
  helperText: {
    color: '#8a9aad',
    fontSize: 11,
    marginTop: 8,
  },
  suggestionsBox: {
    backgroundColor: '#101b2c',
    borderWidth: 1,
    borderColor: '#24344b',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1d2b3d',
  },
  suggestionText: {
    color: '#e8eefb',
    fontSize: 14,
  },
  fieldGroup: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a3b4d',
    backgroundColor: '#0a1220',
    minWidth: 70,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#112f2a',
    borderColor: '#1dbf73',
  },
  chipText: {
    color: '#dce7f7',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#6ee7a0',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  columnCell: {
    flex: 1,
  },
  timeButton: {
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: '#2a3b4d',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#06130b',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#ff7d8d',
    fontWeight: '700',
    fontSize: 14,
  },
});

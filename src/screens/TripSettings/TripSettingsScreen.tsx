import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';
import type { Trip } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'TripSettings'>;

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function TripSettingsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [budgetPerPerson, setBudgetPerPerson] = useState('');
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
    const trip = data as Trip | null;
    if (trip) {
      setName(trip.name);
      setDestination(trip.destination);
      setStartDate(new Date(trip.start_date));
      setEndDate(new Date(trip.end_date));
      setBudgetPerPerson(trip.budget_per_person ? String(trip.budget_per_person) : '');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!name.trim() || !destination.trim() || !startDate || !endDate) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from('trips')
      .update({
        name: name.trim(),
        destination: destination.trim(),
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
        budget_per_person: budgetPerPerson.trim() ? Number(budgetPerPerson.trim()) : null,
      })
      .eq('id', tripId);

    setSaving(false);

    if (updateError) {
      setError(`Non siamo riusciti a salvare (${updateError.message}).`);
      return;
    }
    setSaved(true);
    navigation.goBack();
  }

  function handleDelete() {
    Alert.alert(
      'Elimina viaggio',
      `Eliminare "${name}"? Tutti i dati (itinerario, spese, chat, voti) andranno persi definitivamente.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase.from('trips').delete().eq('id', tripId);
            if (deleteError) {
              Alert.alert('Errore', `Non siamo riusciti a eliminare il viaggio (${deleteError.message}).`);
              return;
            }
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Impostazioni viaggio</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nome viaggio</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />

          <Text style={styles.label}>Destinazione</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.row}>
            <View style={styles.flexInput}>
              <Text style={styles.label}>Partenza</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowPicker('start');
                }}
              >
                <Text style={styles.inputText}>{startDate ? formatDateLabel(startDate) : '—'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.flexInput}>
              <Text style={styles.label}>Ritorno</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowPicker('end');
                }}
              >
                <Text style={styles.inputText}>{endDate ? formatDateLabel(endDate) : '—'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showPicker && (
            <View style={styles.datePickerBlock}>
              <DateTimePicker
                value={(showPicker === 'start' ? startDate : endDate) ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowPicker(null);
                  if (selected) {
                    if (showPicker === 'start') setStartDate(selected);
                    else setEndDate(selected);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneButton} onPress={() => setShowPicker(null)}>
                  <Text style={styles.doneButtonText}>Fatto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.label}>Budget a persona</Text>
          <TextInput
            style={styles.input}
            value={budgetPerPerson}
            onChangeText={setBudgetPerPerson}
            keyboardType="numeric"
            placeholder="Facoltativo"
            placeholderTextColor={colors.textMuted}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.savedText}>Salvato ✓</Text>}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.saveButtonText}>Salva modifiche</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Elimina viaggio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  form: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
  row: { flexDirection: 'row', gap: spacing.md },
  flexInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  inputText: { ...typography.body, color: colors.text },
  datePickerBlock: { backgroundColor: colors.surface, borderRadius: radius.card, alignItems: 'center' },
  doneButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  doneButtonText: { ...typography.body, color: colors.accent, fontWeight: '600' },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
  savedText: { ...typography.caption, color: colors.success, textAlign: 'center', marginTop: spacing.sm },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  deleteButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  deleteButtonText: { ...typography.body, fontWeight: '600', color: colors.danger },
});

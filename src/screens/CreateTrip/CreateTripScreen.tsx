import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { POPULAR_DESTINATIONS, VIBE_OPTIONS } from '../../types/tripGenerator';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTrip'>;

type Step = 'destination' | 'dates' | 'group' | 'vibe' | 'review';

interface ChatMessage {
  id: string;
  from: 'ai' | 'user';
  text: string;
}

function AIBubble({ text }: { text: string }) {
  return (
    <View style={styles.aiBubbleRow}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

export default function CreateTripScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('destination');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'q1', from: 'ai', text: 'Dove vi va di andare? 🌍' },
  ]);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupSize, setGroupSize] = useState(4);
  const [budgetPerPerson, setBudgetPerPerson] = useState('300');
  const [vibe, setVibe] = useState<string[]>([]);

  function pushMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  function confirmDestination(value: string) {
    if (!value.trim()) return;
    setDestination(value.trim());
    pushMessage({ id: `a-dest-${Date.now()}`, from: 'user', text: value.trim() });
    pushMessage({ id: `q-dates-${Date.now()}`, from: 'ai', text: 'Quando partite? 📅' });
    setStep('dates');
  }

  function confirmDates() {
    if (!startDate.trim() || !endDate.trim()) return;
    pushMessage({
      id: `a-dates-${Date.now()}`,
      from: 'user',
      text: `${startDate} → ${endDate}`,
    });
    pushMessage({
      id: `q-group-${Date.now()}`,
      from: 'ai',
      text: 'Quanti siete e con che budget a testa? 💰',
    });
    setStep('group');
  }

  function confirmGroup() {
    const budget = parseInt(budgetPerPerson, 10);
    if (!budget || budget <= 0) return;
    pushMessage({
      id: `a-group-${Date.now()}`,
      from: 'user',
      text: `${groupSize} persone, ${budget}€ a testa`,
    });
    pushMessage({
      id: `q-vibe-${Date.now()}`,
      from: 'ai',
      text: 'Che vibe cercate? ✨',
    });
    setStep('vibe');
  }

  function toggleVibe(key: string) {
    setVibe((prev) => (prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]));
  }

  function confirmVibe() {
    if (vibe.length === 0) return;
    const labels = VIBE_OPTIONS.filter((o) => vibe.includes(o.key)).map((o) => o.label);
    pushMessage({ id: `a-vibe-${Date.now()}`, from: 'user', text: labels.join(', ') });
    pushMessage({
      id: `q-review-${Date.now()}`,
      from: 'ai',
      text: 'Perfetto, genero il vostro viaggio! 🚀',
    });
    setStep('review');
  }

  function handleGenerate() {
    navigation.replace('AILoading', {
      payload: {
        destination,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        group_size: groupSize,
        budget_per_person: parseInt(budgetPerPerson, 10),
        currency: 'EUR',
        vibe,
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crea il tuo viaggio</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) =>
          m.from === 'ai' ? <AIBubble key={m.id} text={m.text} /> : <UserBubble key={m.id} text={m.text} />
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        {step === 'destination' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {POPULAR_DESTINATIONS.map((d) => (
                <TouchableOpacity key={d} style={styles.chip} onPress={() => confirmDestination(d)}>
                  <Text style={styles.chipText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Scrivi una destinazione..."
                placeholderTextColor={colors.textMuted}
                value={destination}
                onChangeText={setDestination}
                onSubmitEditing={() => confirmDestination(destination)}
              />
              <TouchableOpacity style={styles.sendButton} onPress={() => confirmDestination(destination)}>
                <Text style={styles.sendButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'dates' && (
          <>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, styles.flexInput]}
                placeholder="Inizio (AAAA-MM-GG)"
                placeholderTextColor={colors.textMuted}
                value={startDate}
                onChangeText={setStartDate}
              />
              <TextInput
                style={[styles.textInput, styles.flexInput]}
                placeholder="Fine (AAAA-MM-GG)"
                placeholderTextColor={colors.textMuted}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmDates}>
              <Text style={styles.confirmButtonText}>Continua</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'group' && (
          <>
            <View style={styles.stepperRow}>
              <Text style={styles.label}>Persone</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setGroupSize((v) => Math.max(2, v - 1))}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{groupSize}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setGroupSize((v) => Math.min(20, v + 1))}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Budget a testa (€)</Text>
              <TextInput
                style={[styles.textInput, styles.flexInput]}
                keyboardType="number-pad"
                placeholder="300"
                placeholderTextColor={colors.textMuted}
                value={budgetPerPerson}
                onChangeText={setBudgetPerPerson}
              />
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmGroup}>
              <Text style={styles.confirmButtonText}>Continua</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'vibe' && (
          <>
            <View style={styles.vibeGrid}>
              {VIBE_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.chip, vibe.includes(o.key) && styles.chipSelected]}
                  onPress={() => toggleVibe(o.key)}
                >
                  <Text
                    style={[styles.chipText, vibe.includes(o.key) && styles.chipTextSelected]}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmVibe}>
              <Text style={styles.confirmButtonText}>Continua</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'review' && (
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
            <Text style={styles.confirmButtonText}>Genera il viaggio con l'AI ✨</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  messages: { padding: spacing.md, gap: spacing.sm },
  aiBubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  aiBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    padding: spacing.md,
    maxWidth: '80%',
  },
  aiBubbleText: { ...typography.body, color: colors.text },
  userBubbleRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    borderBottomRightRadius: 4,
    padding: spacing.md,
    maxWidth: '80%',
  },
  userBubbleText: { ...typography.body, color: colors.text },
  inputArea: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  chipsRow: { flexGrow: 0, marginBottom: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...typography.caption, color: colors.text },
  chipTextSelected: { color: colors.text, fontWeight: '600' },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 48,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    flex: 1,
  },
  flexInput: { flex: 1 },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: { ...typography.h1, color: colors.text, lineHeight: 28 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.body, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { ...typography.h2, color: colors.text },
  stepperValue: { ...typography.monoLg, color: colors.text, minWidth: 32, textAlign: 'center' },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

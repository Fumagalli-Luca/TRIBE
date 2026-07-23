import { useEffect, useState } from 'react';
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
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { POPULAR_DESTINATIONS, VIBE_OPTIONS } from '../../types/tripGenerator';
import GradientButton from '../../components/GradientButton';
import { hapticImpact } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTrip'>;

type Step = 'destination' | 'dates' | 'group' | 'vibe' | 'review';

const TYPING_DELAY_MS = 650;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ChatMessage {
  id: string;
  from: 'ai' | 'user';
  text: string;
}

function AIBubble({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInUp.duration(220)} style={styles.aiBubbleRow}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInUp.duration(220)} style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 350, easing: Easing.inOut(Easing.ease) })
          ),
          -1
        )
      );
    dot1.value = pulse(0);
    dot2.value = pulse(120);
    dot3.value = pulse(240);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View entering={FadeInUp.duration(180)} style={styles.aiBubbleRow}>
      <View style={[styles.aiBubble, styles.typingBubble]}>
        <Animated.View style={[styles.typingDot, style1]} />
        <Animated.View style={[styles.typingDot, style2]} />
        <Animated.View style={[styles.typingDot, style3]} />
      </View>
    </Animated.View>
  );
}

export default function CreateTripScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('destination');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'q1', from: 'ai', text: 'Dove vi va di andare? 🌍' },
  ]);
  const [typing, setTyping] = useState(false);

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [budgetPerPerson, setBudgetPerPerson] = useState('300');
  const [vibe, setVibe] = useState<string[]>([]);

  function pushMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
  }

  function pushUserThenAI(userMsg: ChatMessage, aiMsg: ChatMessage, nextStep: Step) {
    hapticImpact();
    pushMessage(userMsg);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushMessage(aiMsg);
      setStep(nextStep);
    }, TYPING_DELAY_MS);
  }

  function confirmDestination(value: string) {
    if (!value.trim()) return;
    setDestination(value.trim());
    pushUserThenAI(
      { id: `a-dest-${Date.now()}`, from: 'user', text: value.trim() },
      { id: `q-dates-${Date.now()}`, from: 'ai', text: 'Quando partite? 📅' },
      'dates'
    );
  }

  function confirmDates() {
    if (!startDate || !endDate) return;
    pushUserThenAI(
      {
        id: `a-dates-${Date.now()}`,
        from: 'user',
        text: `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`,
      },
      { id: `q-group-${Date.now()}`, from: 'ai', text: 'Quanti siete e con che budget a testa? 💰' },
      'group'
    );
  }

  function confirmGroup() {
    const budget = parseInt(budgetPerPerson, 10);
    if (!budget || budget <= 0) return;
    pushUserThenAI(
      { id: `a-group-${Date.now()}`, from: 'user', text: `${groupSize} persone, ${budget}€ a testa` },
      { id: `q-vibe-${Date.now()}`, from: 'ai', text: 'Che vibe cercate? ✨' },
      'vibe'
    );
  }

  function toggleVibe(key: string) {
    hapticImpact();
    setVibe((prev) => (prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]));
  }

  function confirmVibe() {
    if (vibe.length === 0) return;
    const labels = VIBE_OPTIONS.filter((o) => vibe.includes(o.key)).map((o) => o.label);
    pushUserThenAI(
      { id: `a-vibe-${Date.now()}`, from: 'user', text: labels.join(', ') },
      { id: `q-review-${Date.now()}`, from: 'ai', text: 'Perfetto, genero il vostro viaggio! 🚀' },
      'review'
    );
  }

  function handleGenerate() {
    if (!startDate || !endDate) return;
    hapticImpact();
    navigation.replace('AILoading', {
      payload: {
        destination,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
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
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
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
        {typing && <TypingIndicator />}
      </ScrollView>

      {!typing && (
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
                <TouchableOpacity
                  style={[styles.textInput, styles.flexInput, styles.dateButton]}
                  onPress={() => setActiveDatePicker('start')}
                >
                  <Text style={startDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                    {startDate ? formatDateLabel(startDate) : 'Data inizio'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.textInput, styles.flexInput, styles.dateButton]}
                  onPress={() => setActiveDatePicker('end')}
                >
                  <Text style={endDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                    {endDate ? formatDateLabel(endDate) : 'Data fine'}
                  </Text>
                </TouchableOpacity>
              </View>

              {activeDatePicker && (
                <DateTimePicker
                  value={(activeDatePicker === 'start' ? startDate : endDate) ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={activeDatePicker === 'end' && startDate ? startDate : new Date()}
                  themeVariant="dark"
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setActiveDatePicker(null);
                    if (!selected) return;
                    if (activeDatePicker === 'start') {
                      setStartDate(selected);
                      if (endDate && endDate < selected) setEndDate(null);
                    } else {
                      setEndDate(selected);
                    }
                  }}
                />
              )}

              {Platform.OS === 'ios' && activeDatePicker && (
                <TouchableOpacity
                  style={styles.confirmButtonOutline}
                  onPress={() => setActiveDatePicker(null)}
                >
                  <Text style={styles.confirmButtonOutlineText}>Fatto</Text>
                </TouchableOpacity>
              )}

              <GradientButton label="Continua" onPress={confirmDates} />
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
              <GradientButton label="Continua" onPress={confirmGroup} />
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
              <GradientButton label="Continua" onPress={confirmVibe} />
            </>
          )}

          {step === 'review' && (
            <GradientButton label="Genera il viaggio con l'AI ✨" onPress={handleGenerate} />
          )}
        </View>
      )}
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
  typingBubble: { flexDirection: 'row', gap: 5, paddingVertical: spacing.md + 2 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
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
  dateButton: { justifyContent: 'center' },
  dateButtonText: { ...typography.body, color: colors.text },
  dateButtonPlaceholder: { ...typography.body, color: colors.textMuted },
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
  confirmButtonOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonOutlineText: { ...typography.body, fontWeight: '600', color: colors.primary },
});

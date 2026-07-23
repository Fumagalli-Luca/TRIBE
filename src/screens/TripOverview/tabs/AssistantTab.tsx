import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { askTripAssistant } from '../../../lib/tripAssistant';
import type { AiConversationMessage } from '../../../types/database';

interface Props {
  tripId: string;
}

const QUICK_ACTIONS = [
  { label: '💰 Ottimizza budget', prompt: 'Guardando le spese fatte finora e il budget totale, come dovremmo gestire i soldi rimasti? Dacci qualche consiglio pratico.' },
  { label: '🎯 Suggerisci attività', prompt: "Suggeriscici 2-3 attività o posti da aggiungere all'itinerario in base alla destinazione e al vibe del viaggio." },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function AssistantTab({ tripId }: Props) {
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    if (user) {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setMessages((data as AiConversationMessage[]) ?? []);
    }
    setLoading(false);
  }

  async function sendQuestion(question: string) {
    if (!question.trim() || thinking || !userId) return;

    const { data: userRow } = await supabase
      .from('ai_conversations')
      .insert({ trip_id: tripId, user_id: userId, role: 'user', content: question.trim() })
      .select()
      .single();
    if (userRow) setMessages((prev) => [...prev, userRow as AiConversationMessage]);

    setThinking(true);
    try {
      const answer = await askTripAssistant(tripId, question.trim());
      const { data: aiRow } = await supabase
        .from('ai_conversations')
        .insert({ trip_id: tripId, user_id: userId, role: 'assistant', content: answer })
        .select()
        .single();
      if (aiRow) setMessages((prev) => [...prev, aiRow as AiConversationMessage]);
    } catch {
      const { data: aiRow } = await supabase
        .from('ai_conversations')
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: 'assistant',
          content: 'Non sono riuscito a rispondere ora, riprova tra un momento.',
        })
        .select()
        .single();
      if (aiRow) setMessages((prev) => [...prev, aiRow as AiConversationMessage]);
    } finally {
      setThinking(false);
    }
  }

  async function handleSend() {
    const question = draft.trim();
    setDraft('');
    await sendQuestion(question);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((qa) => (
              <TouchableOpacity key={qa.label} style={styles.quickAction} onPress={() => sendQuestion(qa.prompt)}>
                <Text style={styles.quickActionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={[styles.messageWrap, item.role === 'user' ? styles.messageWrapMine : styles.messageWrapOther]}
          >
            <View style={[styles.messageBubble, item.role === 'user' ? styles.messageBubbleMine : styles.messageBubbleOther]}>
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Chiedi qualsiasi cosa sul viaggio — itinerario, budget, idee per attività. Solo tu vedi questa conversazione.
          </Text>
        }
      />

      {thinking && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.thinkingText}>Sto pensando...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Chiedi all'assistente..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!draft.trim() || thinking}>
          <Text style={styles.sendButtonText}>Invia</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  listContent: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  quickAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickActionText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  messageWrap: { maxWidth: '85%', marginVertical: 2 },
  messageWrapMine: { alignSelf: 'flex-end' },
  messageWrapOther: { alignSelf: 'flex-start' },
  messageBubble: { borderRadius: radius.card, padding: spacing.sm },
  messageBubbleMine: { backgroundColor: colors.primary },
  messageBubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  messageText: { ...typography.body, color: colors.text },
  messageTime: { ...typography.caption, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  thinkingText: { ...typography.caption, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.buttonPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
});

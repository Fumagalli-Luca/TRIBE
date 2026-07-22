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
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import type { ChatMessage } from '../../../types/database';

interface Props {
  tripId: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatTab({ tripId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`chat-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
    setLoading(false);
  }

  async function handleSend() {
    if (!draft.trim() || sending || !userId) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');

    await supabase.from('chat_messages').insert({
      trip_id: tripId,
      sender_id: userId,
      type: 'text',
      content,
    });
    setSending(false);
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
        renderItem={({ item }) =>
          item.type === 'system' ? (
            <View style={styles.systemBubble}>
              <Text style={styles.systemText}>{item.content}</Text>
            </View>
          ) : (
            <View
              style={[
                styles.messageBubble,
                item.sender_id === userId ? styles.messageBubbleMine : styles.messageBubbleOther,
              ]}
            >
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
            </View>
          )
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Nessun messaggio ancora.</Text>}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Invia</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  listContent: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  systemText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: radius.card,
    padding: spacing.sm,
    marginVertical: 2,
  },
  messageBubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  messageBubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  messageText: { ...typography.body, color: colors.text },
  messageTime: { ...typography.caption, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
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

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ImagePlus } from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { notifyTrip } from '../../../lib/sendPush';
import { hapticSelect } from '../../../lib/haptics';
import type { ChatMessage } from '../../../types/database';

interface Props {
  tripId: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'TripOverview'>;
}

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢'];

type Reactions = Record<string, string[]>;

function getReactions(message: ChatMessage): Reactions {
  return (message.metadata as { reactions?: Reactions } | null)?.reactions ?? {};
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatTab({ tripId, navigation }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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
    notifyTrip(tripId, 'Nuovo messaggio', content);
  }

  async function handlePickImage() {
    if (uploadingImage || !userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (result.canceled) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${tripId}/${userId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat-media').getPublicUrl(path);

      await supabase.from('chat_messages').insert({
        trip_id: tripId,
        sender_id: userId,
        type: 'image',
        content: publicUrlData.publicUrl,
      });
      notifyTrip(tripId, 'Nuova foto', 'Foto condivisa nella chat');
    } catch {
      // Upload fallito silenziosamente: la chat resta usabile senza bloccare l'utente.
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleReact(message: ChatMessage, emoji: string) {
    if (!userId) return;
    hapticSelect();
    const reactions = getReactions(message);
    const current = reactions[emoji] ?? [];
    const nextForEmoji = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    const nextReactions = { ...reactions, [emoji]: nextForEmoji };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id ? { ...m, metadata: { ...(m.metadata ?? {}), reactions: nextReactions } } : m
      )
    );
    setReactionPickerFor(null);

    await supabase
      .from('chat_messages')
      .update({ metadata: { ...(message.metadata ?? {}), reactions: nextReactions } })
      .eq('id', message.id);
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
        renderItem={({ item }) => {
          const voteId = (item.metadata as { vote_id?: string } | null)?.vote_id;
          if (item.type === 'system') {
            return (
              <Animated.View entering={FadeInUp.duration(220)} style={styles.systemBubble}>
                <Text style={styles.systemText}>{item.content}</Text>
                {voteId && (
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => navigation.navigate('Voting', { tripId, voteId })}
                  >
                    <Text style={styles.voteButtonText}>VOTA ORA</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            );
          }

          const reactions = getReactions(item);
          const activeReactions = Object.entries(reactions).filter(([, ids]) => ids.length > 0);
          const isMine = item.sender_id === userId;

          return (
            <Animated.View
              entering={FadeInUp.duration(220)}
              style={[styles.messageWrap, isMine ? styles.messageWrapMine : styles.messageWrapOther]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => setReactionPickerFor((prev) => (prev === item.id ? null : item.id))}
                style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}
              >
                {item.type === 'image' && item.content ? (
                  <Image source={{ uri: item.content }} style={styles.messageImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.messageText}>{item.content}</Text>
                )}
                <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              </TouchableOpacity>

              {reactionPickerFor === item.id && (
                <View style={styles.reactionPicker}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <TouchableOpacity key={emoji} onPress={() => handleReact(item, emoji)} style={styles.reactionPickerItem}>
                      <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeReactions.length > 0 && (
                <View style={styles.reactionRow}>
                  {activeReactions.map(([emoji, ids]) => (
                    <TouchableOpacity key={emoji} onPress={() => handleReact(item, emoji)} style={styles.reactionChip}>
                      <Text style={styles.reactionChipText}>
                        {emoji} {ids.length}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nessun messaggio ancora.</Text>}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} disabled={uploadingImage}>
          {uploadingImage ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <ImagePlus size={22} color={colors.textMuted} />
          )}
        </TouchableOpacity>
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
  voteButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    alignSelf: 'center',
  },
  voteButtonText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  messageWrap: { maxWidth: '80%', marginVertical: 2 },
  messageWrapMine: { alignSelf: 'flex-end' },
  messageWrapOther: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  messageBubbleMine: { backgroundColor: colors.primary },
  messageBubbleOther: { backgroundColor: colors.surface },
  messageImage: { width: 200, height: 200, borderRadius: radius.buttonPrimary },
  messageText: { ...typography.body, color: colors.text },
  messageTime: { ...typography.caption, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  reactionPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    padding: spacing.xs,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  reactionPickerItem: { paddingHorizontal: 4 },
  reactionPickerEmoji: { fontSize: 20 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  reactionChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  reactionChipText: { ...typography.caption, color: colors.text },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: radius.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
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

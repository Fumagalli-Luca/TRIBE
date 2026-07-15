import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string;
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={styles.menuRowLabel}>{label}</Text>
      <Text style={styles.menuRowChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfile);
    loadProfile();
    return unsubscribe;
  }, [navigation]);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    setProfile(data as ProfileData | null);
    setLoading(false);
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Serve il permesso di accesso alle foto per cambiare immagine profilo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !userId) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Non siamo riusciti a caricare la foto (${message}).`);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—';

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.identityBlock}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <ActivityIndicator color={colors.text} />
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholderText}>
              {profile?.first_name ? profile.first_name[0].toUpperCase() : '?'}
            </Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>✎</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.fullName}>{fullName}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.menuGroup}>
        <MenuRow label="Informazioni personali" onPress={() => navigation.navigate('EditProfile')} />
        <MenuRow label="Sicurezza" onPress={() => navigation.navigate('Security')} />
        <MenuRow label="Password" onPress={() => navigation.navigate('ForgotPassword')} />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Esci</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  identityBlock: { alignItems: 'center', gap: spacing.xs },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholderText: { ...typography.display, color: colors.text },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarEditBadgeText: { fontSize: 13, color: colors.background },
  fullName: { ...typography.h2, color: colors.text },
  email: { ...typography.caption, color: colors.textMuted },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLabel: { ...typography.body, color: colors.text },
  menuRowChevron: { ...typography.h2, color: colors.textMuted },
  signOutButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { ...typography.body, color: colors.danger, fontWeight: '600' },
});

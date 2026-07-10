import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

// Dataset pubblico gratuito dei comuni italiani (nome, provincia, CAP).
// Nessuna chiave API richiesta, nessun costo.
const COMUNI_DATASET_URL =
  'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';

interface ComuneRaw {
  nome: string;
  sigla: string; // provincia, es. "MI"
  cap: string[]; // può avere più CAP, prendiamo il primo
}

export interface ComuneSelection {
  city: string;
  province: string;
  postalCode: string;
}

let cachedComuni: ComuneRaw[] | null = null;
let fetchPromise: Promise<ComuneRaw[]> | null = null;

function loadComuni(): Promise<ComuneRaw[]> {
  if (cachedComuni) return Promise.resolve(cachedComuni);
  if (!fetchPromise) {
    fetchPromise = fetch(COMUNI_DATASET_URL)
      .then((res) => res.json())
      .then((data: ComuneRaw[]) => {
        cachedComuni = data;
        return data;
      })
      .catch(() => {
        fetchPromise = null;
        return [];
      });
  }
  return fetchPromise;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (selection: ComuneSelection) => void;
  placeholder?: string;
}

export default function CityAutocomplete({ value, onChangeText, onSelect, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<ComuneRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const comuni = await loadComuni();
      const query = value.trim().toLowerCase();
      const matches = comuni
        .filter((c) => c.nome.toLowerCase().startsWith(query))
        .slice(0, 6);
      setSuggestions(matches);
      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function handleSelect(comune: ComuneRaw) {
    onChangeText(comune.nome);
    onSelect({
      city: comune.nome,
      province: comune.sigla,
      postalCode: comune.cap?.[0] ?? '',
    });
    setShowList(false);
    setSuggestions([]);
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder={placeholder ?? 'Città'}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setShowList(true);
        }}
        onFocus={() => setShowList(true)}
      />
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      )}
      {showList && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.nome}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelect(item)}>
                <Text style={styles.suggestionText}>
                  {item.nome} <Text style={styles.suggestionMeta}>({item.sigla})</Text>
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  loadingRow: { position: 'absolute', right: spacing.md, top: 14 },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    marginTop: spacing.xs,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { ...typography.body, color: colors.text },
  suggestionMeta: { ...typography.caption, color: colors.textMuted },
});

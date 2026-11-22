import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

type Props = {
  uri: string | null;
  width: number;
  style?: StyleProp<ViewStyle>;
};

/** Jaquette ou affiche au format 2:3, avec une image par défaut quand l'adresse vaut null. */
export function Cover({ uri, width, style }: Props) {
  const size = { width, height: Math.round(width * 1.5) };
  if (!uri) {
    return (
      <View style={[styles.placeholder, size, style]}>
        <Text style={[styles.placeholderIcon, { fontSize: width * 0.4 }]}>🎬</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.image, size, style as object]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      recyclingKey={uri}
    />
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: radius.sm, backgroundColor: colors.border },
  placeholder: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { opacity: 0.6 },
});

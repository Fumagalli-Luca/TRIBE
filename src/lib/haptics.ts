import * as Haptics from 'expo-haptics';

/** Micro-interazioni con feedback aptico (spec §2.6): swipe vote, conferma spesa, invio prompt AI. */
export const hapticSelect = () => Haptics.selectionAsync();
export const hapticImpact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) =>
  Haptics.impactAsync(style);
export const hapticSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

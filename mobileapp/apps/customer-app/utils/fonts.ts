import * as Font from 'expo-font';

export const loadFonts = async () => {
  await Font.loadAsync({
    'Nexa-ExtraLight': require('../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../assets/fonts/Nexa-Heavy.ttf'),
  });
};

export const fontFamily = {
  light: 'Nexa-ExtraLight',
  heavy: 'Nexa-Heavy',
} as const;

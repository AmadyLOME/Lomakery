import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS } from '../constants/theme';

const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  FamilyList: 'cart',
  Recipes: 'book',
  WeekMenu: 'calendar',
  Profile: 'person',
};

// Barre d'onglets flottante : pilule vert foncé, onglet actif en pastille orange avec son libellé
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom - 6, 16) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
        const icon = ICONS[route.name] ?? 'ellipse';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={[styles.tab, focused && styles.tabActive]}
          >
            <Ionicons name={focused ? icon : (`${icon}-outline` as any)} size={22} color={focused ? '#fff' : COLORS.inkSoft} />
            {focused ? <Text style={styles.label}>{label}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 9,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  tab: {
    height: 48,
    minWidth: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: { backgroundColor: COLORS.primary, paddingHorizontal: 16 },
  label: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

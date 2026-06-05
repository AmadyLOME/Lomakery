import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToFamilyList,
  subscribeToFamilyGroups,
  addFamilyItem,
  addFamilyGroup,
  deleteFamilyGroup,
  toggleItem,
  deleteItem,
  updateItem,
  checkItemWithStock,
  decrementStock,
  incrementStock,
} from '../services/lists';
import { ShoppingItem, ShoppingGroup } from '../types';
import FamilySettings from '../components/FamilySettings';
import FamilyShoppingView from '../components/FamilyShoppingView';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

type Tab = 'liste' | 'parametrage';

export default function FamilyListScreen({ route }: any) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(route?.params?.initialTab ?? 'liste');

  const householdId: string = profile?.householdId ?? '';
  const collectionPath = `households/${householdId}/familyList`;

  useEffect(() => {
    if (!householdId) return;
    const unsubItems = subscribeToFamilyList(householdId, setItems);
    const unsubGroups = subscribeToFamilyGroups(householdId, setGroups);
    return () => { unsubItems(); unsubGroups(); };
  }, [householdId]);

  if (!user || !householdId) return null;

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liste' && styles.tabActive]}
          onPress={() => setActiveTab('liste')}
        >
          <Text style={[styles.tabText, activeTab === 'liste' && styles.tabTextActive]}>
            🛒 Liste
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'parametrage' && styles.tabActive]}
          onPress={() => setActiveTab('parametrage')}
        >
          <Text style={[styles.tabText, activeTab === 'parametrage' && styles.tabTextActive]}>
            ⚙️ Paramétrer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {activeTab === 'liste' ? (
        <FamilyShoppingView
          items={items}
          groups={groups}
          onToggle={(id, checked) => toggleItem(collectionPath, id, checked)}
          onCheckWithStock={(id, addedQty, currentStock, threshold) => checkItemWithStock(collectionPath, id, addedQty, currentStock, threshold)}
          onDecrement={(item) => decrementStock(collectionPath, item)}
          onIncrement={(item) => incrementStock(collectionPath, item)}
        />
      ) : (
        <FamilySettings
          items={items}
          groups={groups}
          currentUserId={user.uid}
          onAddItem={(item) => addFamilyItem(householdId, item)}
          onUpdateItem={(id, fields) => updateItem(collectionPath, id, fields)}
          onDeleteItem={(id) => deleteItem(collectionPath, id)}
          onAddGroup={(name) => addFamilyGroup(householdId, name)}
          onDeleteGroup={(groupId) => deleteFamilyGroup(householdId, groupId)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: SPACING.xs,
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
});

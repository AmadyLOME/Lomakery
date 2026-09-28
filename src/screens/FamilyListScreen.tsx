import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import RoundButton from '../components/RoundButton';
import { getHousehold } from '../services/household';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToFamilyList,
  subscribeToFamilyGroups,
  addFamilyItem,
  addFamilyGroup,
  updateFamilyGroup,
  deleteFamilyGroup,
  toggleItem,
  deleteItem,
  updateItem,
  checkItemWithStock,
  decrementStock,
  incrementStock,
} from '../services/lists';
import { ShoppingItem, ShoppingGroup } from '../types';
import { notify, senderName } from '../services/notifications';
import FamilySettings from '../components/FamilySettings';
import FamilyShoppingView from '../components/FamilyShoppingView';
import { COLORS } from '../constants/theme';

type Tab = 'liste' | 'parametrage';

export default function FamilyListScreen({ route }: any) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(route?.params?.initialTab ?? 'liste');
  const [householdName, setHouseholdName] = useState<string | null>(null);

  const householdId: string = profile?.householdId ?? '';
  const collectionPath = `households/${householdId}/familyList`;

  useEffect(() => {
    if (!householdId) return;
    const unsubItems = subscribeToFamilyList(householdId, setItems);
    const unsubGroups = subscribeToFamilyGroups(householdId, setGroups);
    getHousehold(householdId).then((h) => setHouseholdName(h?.name ?? null)).catch(() => {});
    return () => { unsubItems(); unsubGroups(); };
  }, [householdId]);

  // Ouverture depuis une recette (« Aller au Paramétrage »)
  useEffect(() => {
    if (route?.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route?.params?.initialTab]);

  if (!user || !householdId) return null;

  // checked = « À la casa », non coché = « À acheter »
  const notifyToBuy = (name: string) =>
    notify(householdId, '🛒 À acheter', `${senderName()} a ajouté « ${name} » à la liste`);

  const handleToggle = (id: string, checked: boolean) => {
    toggleItem(collectionPath, id, checked);
    const item = items.find((i) => i.id === id);
    if (item && !checked) notifyToBuy(item.name);
  };

  const handleDecrement = (item: ShoppingItem) => {
    decrementStock(collectionPath, item);
    const newStock = (item.stock ?? 1) - 1;
    if (item.checked && newStock <= (item.threshold ?? 0)) {
      notify(householdId, '📉 Stock bas', `« ${item.name} » est passé sous le seuil (reste ${newStock})`);
    }
  };

  const handleAddItem = async (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const id = await addFamilyItem(householdId, item);
    if (!item.checked) notifyToBuy(item.name);
    return id;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        subtitle={householdName ?? undefined}
        title={activeTab === 'liste' ? 'Courses' : 'Paramétrage'}
        right={
          activeTab === 'liste' ? (
            <RoundButton icon="options-outline" label="Paramétrer la liste" onPress={() => setActiveTab('parametrage')} />
          ) : (
            <RoundButton icon="checkmark" variant="primary" label="Terminer le paramétrage" onPress={() => setActiveTab('liste')} />
          )
        }
      />

      {activeTab === 'liste' ? (
        <FamilyShoppingView
          items={items}
          groups={groups}
          onToggle={handleToggle}
          onCheckWithStock={(id, addedQty, currentStock, threshold) => checkItemWithStock(collectionPath, id, addedQty, currentStock, threshold)}
          onDecrement={handleDecrement}
          onIncrement={(item) => incrementStock(collectionPath, item)}
          onQuickCreate={(name) =>
            handleAddItem({ name, category: 'autre', quantity: 1, checked: false, addedBy: user.uid })
          }
          onDelete={(id) => deleteItem(collectionPath, id)}
        />
      ) : (
        <FamilySettings
          items={items}
          groups={groups}
          currentUserId={user.uid}
          onAddItem={handleAddItem}
          onUpdateItem={(id, fields) => updateItem(collectionPath, id, fields)}
          onDeleteItem={(id) => deleteItem(collectionPath, id)}
          onAddGroup={(name) => addFamilyGroup(householdId, name)}
          onUpdateGroup={(groupId, name) => updateFamilyGroup(householdId, groupId, name)}
          onDeleteGroup={(groupId) => deleteFamilyGroup(householdId, groupId)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from '../components/FloatingTabBar';
import { useAuth } from '../hooks/useAuth';
import { registerForPushNotifications } from '../services/notifications';
import { ensureMemberProfile } from '../services/members';
import LoginScreen from '../screens/LoginScreen';
import HouseholdSetupScreen from '../screens/HouseholdSetupScreen';
import FamilyListScreen from '../screens/FamilyListScreen';
import RecipesScreen from '../screens/RecipesScreen';
import WeekMenuScreen from '../screens/WeekMenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HelpScreen from '../screens/HelpScreen';
import { COLORS, FONT_SIZE, FONTS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTitleStyle: { fontFamily: FONTS.extrabold, color: COLORS.text, fontSize: FONT_SIZE.xl },
        headerShadowVisible: false,
        headerTintColor: COLORS.primary,
        headerBackTitleStyle: { fontFamily: FONTS.semibold },
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false, title: 'Profil' }} />
      <ProfileStack.Screen name="Help" component={HelpScreen} options={{ title: 'Aide' }} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.background } }}
    >
      <Tab.Screen name="FamilyList" component={FamilyListScreen} options={{ tabBarLabel: 'Courses' }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ tabBarLabel: 'Recettes' }} />
      <Tab.Screen name="WeekMenu" component={WeekMenuScreen} options={{ tabBarLabel: 'Menu' }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();
  const householdId: string | undefined = profile?.householdId;

  useEffect(() => {
    if (!user || !householdId) return;
    registerForPushNotifications(user.uid, householdId).catch((e) =>
      console.error('[notifications] register error:', e?.message ?? e)
    );
    ensureMemberProfile(householdId, user.uid, user.displayName ?? 'Membre').catch((e) =>
      console.error('[members] ensureMemberProfile error:', e?.code ?? e)
    );
  }, [user?.uid, householdId]);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !profile?.householdId ? (
          <Stack.Screen name="HouseholdSetup" component={HouseholdSetupScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

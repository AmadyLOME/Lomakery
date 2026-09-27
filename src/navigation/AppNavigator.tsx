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
import HomeScreen from '../screens/HomeScreen';
import NotesScreen from '../screens/NotesScreen';
import InfosScreen from '../screens/InfosScreen';
import { COLORS, FONT_SIZE, FONTS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

// L'Accueil et tout ce qui s'ouvre depuis lui : mots, infos, profil (via l'avatar), aide
function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTitleStyle: { fontFamily: FONTS.extrabold, color: COLORS.text, fontSize: FONT_SIZE.xl },
        headerShadowVisible: false,
        headerTintColor: COLORS.primary,
        headerBackTitleStyle: { fontFamily: FONTS.semibold },
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Accueil' }} />
      <HomeStack.Screen name="Notes" component={NotesScreen} />
      <HomeStack.Screen name="Infos" component={InfosScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
      <HomeStack.Screen name="Help" component={HelpScreen} options={{ headerShown: true, title: 'Aide' }} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.background } }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="FamilyList" component={FamilyListScreen} options={{ tabBarLabel: 'Courses' }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ tabBarLabel: 'Recettes' }} />
      <Tab.Screen name="WeekMenu" component={WeekMenuScreen} options={{ tabBarLabel: 'Menu' }} />
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

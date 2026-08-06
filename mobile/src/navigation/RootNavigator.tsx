import { Text, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { LandingScreen } from "../screens/LandingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { FeedScreen } from "../screens/FeedScreen";
import { ShareScreen } from "../screens/ShareScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SetupScreen } from "../screens/SetupScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { MyReelsScreen } from "../screens/MyReelsScreen";
import { EditReelScreen } from "../screens/EditReelScreen";
import { SavedWatchScreen } from "../screens/SavedWatchScreen";
import type {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from "./types";
import { colors } from "../theme/colors";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? "700" : "500",
        color: focused ? colors.forest600 : colors.stone500,
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
  );
}

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 18,
        color: focused ? colors.forest600 : colors.stone400,
        marginTop: 4,
      }}
    >
      {symbol}
    </Text>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          backgroundColor: colors.cream50,
          borderTopColor: colors.moss300,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: colors.forest600,
        tabBarInactiveTintColor: colors.stone500,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Home" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="⌂" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Feed" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="≡" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Share"
        component={ShareScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Share" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="+" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Saved" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="♡" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="More" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="···" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Setup" component={SetupScreen} />
      <RootStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <RootStack.Screen name="MyReels" component={MyReelsScreen} />
      <RootStack.Screen name="EditReel" component={EditReelScreen} />
      <RootStack.Screen name="SavedWatch" component={SavedWatchScreen} />
    </RootStack.Navigator>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashEmoji}>🌿</Text>
      <Text style={styles.splashBrand}>Floraly</Text>
    </View>
  );
}

export function RootNavigator() {
  const { user, ready } = useAuth();

  if (!ready) return <Splash />;

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export { MainTabs, AuthNavigator, AppNavigator };

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
  },
  splashEmoji: { fontSize: 40 },
  splashBrand: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: colors.forest700,
  },
});

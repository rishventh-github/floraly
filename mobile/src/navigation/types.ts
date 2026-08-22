import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Landing: undefined;
  Login: { mode?: "login" | "signup" } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Feed: undefined;
  Share: undefined;
  Saved: undefined;
  More: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  Setup: undefined;
  Leaderboard: undefined;
  MyReels: undefined;
  EditReel: { postId: string };
  SavedWatch: { postId?: string } | undefined;
  People: undefined;
  Groups: undefined;
  UserProfile: { userId: string };
};

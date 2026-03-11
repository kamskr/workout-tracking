import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily } from "../lib/theme";

import ExercisesScreen from "../screens/ExercisesScreen";
import ExerciseDetailScreen from "../screens/ExerciseDetailScreen";
import WorkoutsScreen from "../screens/WorkoutsScreen";
import ActiveWorkoutScreen from "../screens/ActiveWorkoutScreen";
import GroupSessionScreen from "../screens/GroupSessionScreen";
import JoinSessionScreen from "../screens/JoinSessionScreen";
import TemplatesScreen from "../screens/TemplatesScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import FeedScreen from "../screens/FeedScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import OtherProfileScreen from "../screens/OtherProfileScreen";
import SharedWorkoutScreen from "../screens/SharedWorkoutScreen";
import ChallengesScreen from "../screens/ChallengesScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import ChallengeDetailScreen from "../screens/ChallengeDetailScreen";

// ── Navigation type params ───────────────────────────────────────────────────

export type FeedStackParamList = {
  FeedMain: undefined;
  OtherProfile: { userId?: string; username?: string };
  SharedWorkout: { feedItemId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileSetup: undefined;
  OtherProfile: { userId?: string; username?: string };
};

export type WorkoutsStackParamList = {
  WorkoutHistory: undefined;
  ActiveWorkout: undefined;
  GroupSession: { sessionId: string };
  JoinSession: undefined;
};

export type CompeteStackParamList = {
  CompeteMain: undefined;
  Leaderboard: undefined;
  ChallengeDetail: { challengeId: string };
};

// ── Per-tab stack navigators (allow drill-down within each tab) ──────────────

const ExercisesStack = createNativeStackNavigator();
function ExercisesTab() {
  return (
    <ExercisesStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <ExercisesStack.Screen name="ExercisesList" component={ExercisesScreen} />
      <ExercisesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    </ExercisesStack.Navigator>
  );
}

const WorkoutsStack = createNativeStackNavigator<WorkoutsStackParamList>();
function WorkoutsTab() {
  return (
    <WorkoutsStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <WorkoutsStack.Screen name="WorkoutHistory" component={WorkoutsScreen} />
      <WorkoutsStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <WorkoutsStack.Screen name="GroupSession" component={GroupSessionScreen} />
      <WorkoutsStack.Screen name="JoinSession" component={JoinSessionScreen} />
    </WorkoutsStack.Navigator>
  );
}

const TemplatesStack = createNativeStackNavigator();
function TemplatesTab() {
  return (
    <TemplatesStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <TemplatesStack.Screen
        name="TemplatesList"
        component={TemplatesScreen}
      />
    </TemplatesStack.Navigator>
  );
}

const AnalyticsStack = createNativeStackNavigator();
function AnalyticsTab() {
  return (
    <AnalyticsStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <AnalyticsStack.Screen
        name="AnalyticsMain"
        component={AnalyticsScreen}
      />
    </AnalyticsStack.Navigator>
  );
}

const FeedStack = createNativeStackNavigator<FeedStackParamList>();
function FeedTab() {
  return (
    <FeedStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <FeedStack.Screen name="FeedMain" component={FeedScreen} />
      <FeedStack.Screen name="OtherProfile" component={OtherProfileScreen} />
      <FeedStack.Screen name="SharedWorkout" component={SharedWorkoutScreen} />
    </FeedStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileTab() {
  return (
    <ProfileStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <ProfileStack.Screen name="OtherProfile" component={OtherProfileScreen} />
    </ProfileStack.Navigator>
  );
}

const CompeteStack = createNativeStackNavigator<CompeteStackParamList>();
function CompeteTab() {
  return (
    <CompeteStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <CompeteStack.Screen name="CompeteMain" component={ChallengesScreen} />
      <CompeteStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <CompeteStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
    </CompeteStack.Navigator>
  );
}

// ── Bottom Tab Navigator ─────────────────────────────────────────────────────

type TabIconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  Exercises: { active: "barbell", inactive: "barbell-outline" },
  Workouts: { active: "fitness", inactive: "fitness-outline" },
  Templates: { active: "copy", inactive: "copy-outline" },
  Analytics: { active: "stats-chart", inactive: "stats-chart-outline" },
  Feed: { active: "newspaper", inactive: "newspaper-outline" },
  Compete: { active: "trophy", inactive: "trophy-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Exercises" component={ExercisesTab} />
      <Tab.Screen name="Workouts" component={WorkoutsTab} />
      <Tab.Screen name="Templates" component={TemplatesTab} />
      <Tab.Screen name="Analytics" component={AnalyticsTab} />
      <Tab.Screen name="Feed" component={FeedTab} />
      <Tab.Screen name="Compete" component={CompeteTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}

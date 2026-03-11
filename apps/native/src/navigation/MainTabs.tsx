import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily } from "../lib/theme";

import ExercisesScreen from "../screens/ExercisesScreen";
import ExerciseDetailScreen from "../screens/ExerciseDetailScreen";
import WorkoutsScreen from "../screens/WorkoutsScreen";
import ActiveWorkoutScreen from "../screens/ActiveWorkoutScreen";
import TemplatesScreen from "../screens/TemplatesScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import SettingsScreen from "../screens/SettingsScreen";

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

const WorkoutsStack = createNativeStackNavigator();
function WorkoutsTab() {
  return (
    <WorkoutsStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <WorkoutsStack.Screen name="WorkoutHistory" component={WorkoutsScreen} />
      <WorkoutsStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
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

const SettingsStack = createNativeStackNavigator();
function SettingsTab() {
  return (
    <SettingsStack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
      />
    </SettingsStack.Navigator>
  );
}

// ── Bottom Tab Navigator ─────────────────────────────────────────────────────

type TabIconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  Exercises: { active: "barbell", inactive: "barbell-outline" },
  Workouts: { active: "fitness", inactive: "fitness-outline" },
  Templates: { active: "copy", inactive: "copy-outline" },
  Analytics: { active: "stats-chart", inactive: "stats-chart-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
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
      <Tab.Screen name="Settings" component={SettingsTab} />
    </Tab.Navigator>
  );
}

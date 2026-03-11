import { View, StatusBar } from "react-native";
import { useFonts } from "expo-font";
import { LogBox } from "react-native";
import Navigation from "./src/navigation/Navigation";
import ConvexClientProvider from "./ConvexClientProvider";

export default function App() {
  LogBox.ignoreLogs(["Warning: ..."]);
  LogBox.ignoreAllLogs();

  const [loaded] = useFonts({
    Bold: require("./src/assets/fonts/Inter-Bold.ttf"),
    SemiBold: require("./src/assets/fonts/Inter-SemiBold.ttf"),
    Medium: require("./src/assets/fonts/Inter-Medium.ttf"),
    Regular: require("./src/assets/fonts/Inter-Regular.ttf"),

    MBold: require("./src/assets/fonts/Montserrat-Bold.ttf"),
    MSemiBold: require("./src/assets/fonts/Montserrat-SemiBold.ttf"),
    MMedium: require("./src/assets/fonts/Montserrat-Medium.ttf"),
    MRegular: require("./src/assets/fonts/Montserrat-Regular.ttf"),
    MLight: require("./src/assets/fonts/Montserrat-Light.ttf"),
  });
  if (!loaded) {
    return false;
  }

  return (
    <ConvexClientProvider>
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar
          translucent
          backgroundColor="#FFFFFF"
          barStyle="dark-content"
        />
        <Navigation />
      </View>
    </ConvexClientProvider>
  );
}

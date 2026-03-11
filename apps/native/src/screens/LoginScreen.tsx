import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useOAuth } from "@clerk/clerk-expo";
import { AntDesign } from "@expo/vector-icons";
import { colors, fontFamily } from "../lib/theme";

const LoginScreen = () => {
  const { startOAuthFlow: startGoogleAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const onPress = async (authType: string) => {
    try {
      const startFlow =
        authType === "google" ? startGoogleAuthFlow : startAppleAuthFlow;
      const { createdSessionId, setActive } = await startFlow();
      if (createdSessionId && setActive) {
        // Setting the active session triggers isSignedIn → auth-gated navigator
        // automatically switches to MainTabs. No manual navigation needed.
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("[LoginScreen] OAuth error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require("../assets/icons/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Log in to your account</Text>
        <Text style={styles.subtitle}>Welcome! Please login below.</Text>
        <TouchableOpacity
          style={styles.buttonGoogle}
          onPress={() => onPress("google")}
          accessibilityLabel="Continue with Google"
          accessibilityRole="button"
        >
          <Image
            style={styles.googleIcon}
            source={require("../assets/icons/google.png")}
          />
          <Text style={[styles.buttonText, { color: colors.text }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonApple}
          onPress={() => onPress("apple")}
          accessibilityLabel="Continue with Apple"
          accessibilityRole="button"
        >
          <AntDesign name="apple" size={24} color="black" />
          <Text
            style={[styles.buttonText, { color: colors.text, marginLeft: 12 }]}
          >
            Continue with Apple
          </Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={{ fontFamily: fontFamily.regular }}>
            Don't have an account?{" "}
          </Text>
          <Text>Sign up above.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.background,
    padding: 10,
    alignItems: "center",
    width: "98%",
  },
  logo: {
    width: 74,
    height: 74,
    marginTop: 20,
  },
  title: {
    marginTop: 49,
    fontSize: RFValue(21),
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    marginTop: 8,
    fontSize: RFValue(14),
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    marginBottom: 32,
    textAlign: "center",
  },
  buttonText: {
    textAlign: "center",
    fontFamily: fontFamily.semiBold,
    fontSize: RFValue(14),
  },
  buttonGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    marginBottom: 12,
    height: 44,
  },
  buttonApple: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    marginBottom: 32,
  },
  signupContainer: {
    flexDirection: "row",
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
});

export default LoginScreen;

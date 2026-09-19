import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FontFamily, Palette } from "@/constants/theme";

export default function SignUpScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#031A36", "#030E20", "#020914"]}
        end={{ x: 0.72, y: 1 }}
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back to sign in"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.back}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Logo />
            <Image
              accessibilityLabel="Rocket illustration"
              contentFit="contain"
              source={require("@/assets/sign-up.png")}
              style={styles.artwork}
            />
          </View>
          <Text style={styles.title}>
            Create <Text style={styles.accent}>Account</Text>
          </Text>
          <Text style={styles.subtitle}>
            Join DevTask and turn your ideas{`\n`}into real projects.
          </Text>
          <Input
            icon="user-o"
            label="Full Name"
            placeholder="John Doe"
            textContentType="name"
          />
          <Input
            autoCapitalize="none"
            autoComplete="email"
            icon="envelope-o"
            keyboardType="email-address"
            label="Email Address"
            placeholder="you@example.com"
            textContentType="emailAddress"
          />
          <Input
            autoComplete="new-password"
            icon="lock"
            label="Password"
            placeholder="Create a strong password"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            trailing={
              <Pressable
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setShowPassword((value) => !value)}
              >
                <FontAwesome
                  color="#8FCAFF"
                  name={showPassword ? "eye-slash" : "eye"}
                  size={19}
                />
              </Pressable>
            }
          />
          <Input
            autoComplete="new-password"
            icon="lock"
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            trailing={<FontAwesome color="#8FCAFF" name="eye" size={19} />}
          />
          <PrimaryButton
            label="Create Account"
            onPress={() => router.replace("/onboarding")}
          />
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>or</Text>
            <View style={styles.line} />
          </View>
          <Social icon="google" label="Continue with Google" />
          <Social icon="github" label="Continue with GitHub" />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/sign-in")}
          >
            <Text style={styles.footer}>
              Already have an account? <Text style={styles.link}>Sign In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Logo() {
  return (
    <View style={styles.logoArea}>
      <View style={styles.logo}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.prompt}>›_</Text>
      </View>
      <Text style={styles.brand}>
        Dev<Text style={styles.accent}>Task</Text>
      </Text>
      <Text style={styles.tagline}>Build. Finish. Grow.</Text>
    </View>
  );
}
function Input({
  icon,
  label,
  trailing,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: "user-o" | "envelope-o" | "lock";
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <FontAwesome
        color="#B7D7FF"
        name={icon}
        size={icon === "lock" ? 22 : 19}
        style={styles.fieldIcon}
      />
      <View style={styles.fieldCopy}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#8FB5E6"
          selectionColor={Palette.cyan}
          style={styles.input}
          {...props}
        />
      </View>
      {trailing}
    </View>
  );
}
function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={["#0878FF", "#0068FF", "#00D5F5"]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={styles.primaryGradient}
      >
        <Text style={styles.primaryText}>{label}</Text>
        <Text style={styles.arrow}>→</Text>
      </LinearGradient>
    </Pressable>
  );
}
function Social({ icon, label }: { icon: "google" | "github"; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.social, pressed && styles.pressed]}
    >
      <FontAwesome
        color={icon === "google" ? "#EA4335" : "#F8FAFC"}
        name={icon}
        size={24}
      />
      <Text style={styles.socialText}>{label}</Text>
      <Text style={styles.socialArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020914" },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 28, paddingBottom: 26 },
  header: {
    height: 214,
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 17,
  },
  back: { position: "absolute", left: 0, top: 18, zIndex: 2, paddingRight: 12 },
  backIcon: {
    color: "#F2F8FF",
    fontFamily: FontFamily.regular,
    fontSize: 44,
    lineHeight: 36,
  },
  logoArea: { alignItems: "center" },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#04CFFF",
    backgroundColor: "#06295A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00CFFF",
    shadowOpacity: 0.72,
    shadowRadius: 13,
    elevation: 10,
  },
  check: {
    color: "#10D8FF",
    fontSize: 48,
    lineHeight: 51,
    fontFamily: FontFamily.extraBold,
  },
  prompt: {
    position: "absolute",
    right: 9,
    bottom: 5,
    color: "#B9E8FF",
    fontSize: 13,
    fontFamily: FontFamily.mono,
  },
  brand: {
    marginTop: 8,
    color: "#F5F8FF",
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
    fontFamily: FontFamily.extraBold,
  },
  accent: { color: Palette.cyan },
  tagline: { color: "#62B4FF", fontFamily: FontFamily.regular, fontSize: 15 },
  artwork: {
    position: "absolute",
    right: -35,
    bottom: -34,
    width: 178,
    height: 178,
  },
  title: {
    color: "#F7FAFF",
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1.2,
  },
  subtitle: {
    marginTop: 7,
    color: "#B1D2FF",
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  field: {
    minHeight: 62,
    marginTop: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#007BDC",
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  fieldIcon: { width: 31 },
  fieldCopy: { flex: 1 },
  label: {
    color: "#B8D8FF",
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    height: 27,
    padding: 0,
    color: "#EFF7FF",
    fontFamily: FontFamily.regular,
    fontSize: 15,
  },
  primary: {
    marginTop: 18,
    borderRadius: 27,
    shadowColor: "#00BBFF",
    shadowOpacity: 0.48,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  primaryGradient: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  primaryText: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 17 },
  arrow: { color: "#FFF", fontSize: 28 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginVertical: 18,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#057BD9",
  },
  or: { color: "#B9D8FF", fontFamily: FontFamily.regular, fontSize: 14 },
  social: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#007BD9",
    backgroundColor: "rgba(3, 32, 69, .54)",
    paddingHorizontal: 23,
    marginBottom: 10,
  },
  socialText: {
    flex: 1,
    marginLeft: 27,
    color: "#F4F8FF",
    fontFamily: FontFamily.medium,
    fontSize: 16,
  },
  socialArrow: { color: "#C7E5FF", fontSize: 32 },
  footer: {
    marginTop: 8,
    textAlign: "center",
    color: "#A9C9F3",
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  link: { color: "#00BDFF", fontFamily: FontFamily.semibold, fontSize: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});

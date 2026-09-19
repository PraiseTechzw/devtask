import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";

import { api } from "../../convex/_generated/api";
import { FontFamily, Palette } from "@/constants/theme";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [reminders, setReminders] = useState(true);
  const [nudgeTime, setNudgeTime] = useState("08 : 30 AM");
  const [projectName, setProjectName] = useState("");
  const [repository, setRepository] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const createProject = useMutation(api.projects.create);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const startGitHub = useAction(api.github.start);
  useEffect(() => {
    void ensureCurrent({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
  }, [ensureCurrent]);
  const next = () => setStep((current) => Math.min(current + 1, 4) as Step);
  const back = () =>
    step === 1 ? router.back() : setStep((current) => (current - 1) as Step);

  const finish = async () => {
    if (!projectName.trim()) {
      setStep(3);
      setError("Add a name for your first project.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProject({
        name: projectName,
        deadline: deadline || undefined,
        repositoryUrl: repository || undefined,
      });
      await completeOnboarding({
        reminderTime: reminders ? nudgeTime : "off",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      router.replace("/(app)/home");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to finish setup. Please try again.",
      );
      setStep(3);
    } finally {
      setSaving(false);
    }
  };
  if (step === 4) return <ReadyScreen onFinish={finish} saving={saving} />;
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#031A36", "#030E20", "#020914"]}
        end={{ x: 0.72, y: 1 }}
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={back}
            >
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <View style={styles.progress}>
              {[1, 2, 3, 4].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.progressSegment,
                    item <= step && styles.progressActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.count}>{step}/4</Text>
          </View>
          {step === 1 ? (
            <GitHubStep
              onContinue={next}
              onConnect={async () => {
                await ensureCurrent({
                  timeZone:
                    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                });
                return await startGitHub();
              }}
            />
          ) : null}
          {step === 2 ? (
            <ReminderStep
              enabled={reminders}
              nudgeTime={nudgeTime}
              onContinue={next}
              onSaveTime={setNudgeTime}
              onToggle={() => setReminders((value) => !value)}
            />
          ) : null}
          {step === 3 ? (
            <ProjectStep
              deadline={deadline}
              error={error}
              name={projectName}
              onChangeDeadline={setDeadline}
              onChangeName={setProjectName}
              onChangeRepository={setRepository}
              onContinue={next}
              repository={repository}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GitHubStep({
  onConnect,
  onContinue,
}: {
  onConnect: () => Promise<string>;
  onContinue: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const connection = useQuery(api.github.getConnection, {});
  useEffect(() => {
    if (connection?.state === "connected") onContinue();
  }, [connection?.state, onContinue]);
  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const url = await onConnect();
      await Linking.openURL(url);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to connect GitHub.",
      );
      setConnecting(false);
    }
  };
  return (
    <View style={styles.step}>
      <View style={styles.github}>
        <FontAwesome color="#F7FAFC" name="github" size={45} />
      </View>
      <Text style={styles.title}>Connect GitHub</Text>
      <Text style={styles.subtitle}>
        Link GitHub to keep your project activity up to date.
      </Text>
      <View style={styles.connectionCard}>
        <FontAwesome color="#F7FAFC" name="github" size={26} />
        <View style={styles.connectionCopy}>
          <Text style={styles.connectionTitle}>GitHub account</Text>
          <Text style={styles.connectionDescription}>
            Secure OAuth connection
          </Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryAction
        label={connecting ? "Opening GitHub…" : "Connect GitHub"}
        onPress={() => void connect()}
      />
      <View style={styles.security}>
        <FontAwesome color="#A9CFFB" name="lock" size={15} />
        <Text style={styles.securityText}>
          GitHub access is authorized securely. DevTask never stores tokens on
          your device.
        </Text>
      </View>
    </View>
  );
}
function ReminderStep({
  enabled,
  nudgeTime,
  onContinue,
  onSaveTime,
  onToggle,
}: {
  enabled: boolean;
  nudgeTime: string;
  onContinue: () => void;
  onSaveTime: (time: string) => void;
  onToggle: () => void;
}) {
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  return (
    <View style={styles.step}>
      <View style={styles.circleIcon}>
        <FontAwesome color="#BDEBFF" name="bell" size={28} />
      </View>
      <Text style={styles.title}>Reminder preferences</Text>
      <Text style={styles.subtitle}>Stay on track with gentle nudges.</Text>
      <Text style={styles.sectionLabel}>Daily nudge time</Text>
      <Pressable
        accessibilityLabel="Choose daily nudge time"
        accessibilityRole="button"
        onPress={() => setTimePickerOpen(true)}
        style={styles.time}
      >
        <FontAwesome color="#8FC8FF" name="clock-o" size={22} />
        <Text style={styles.timeText}>{nudgeTime.slice(0, 7)}</Text>
        <Text style={styles.am}>{nudgeTime.slice(-2)}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Text style={styles.sectionLabel}>Alert style</Text>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: enabled }}
        onPress={onToggle}
        style={[styles.option, styles.optionFirst]}
      >
        <View style={styles.optionIcon}>
          <FontAwesome color="#7DFFE6" name="bell" size={20} />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>Push notifications</Text>
          <Text style={styles.optionHint}>Recommended</Text>
        </View>
        <View style={[styles.radio, enabled && styles.radioOn]}>
          {enabled ? <View style={styles.radioDot} /> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: !enabled }}
        onPress={onToggle}
        style={styles.option}
      >
        <View style={styles.optionIcon}>
          <FontAwesome color="#B5D8FF" name="mobile" size={27} />
        </View>
        <Text style={styles.optionTitle}>In-app alerts</Text>
        <View style={[styles.radio, !enabled && styles.radioOn]}>
          {!enabled ? <View style={styles.radioDot} /> : null}
        </View>
      </Pressable>
      <PrimaryAction label="Next" onPress={onContinue} />
      <TimePickerSheet
        initialValue={nudgeTime}
        onClose={() => setTimePickerOpen(false)}
        onSave={(time) => {
          onSaveTime(time);
          setTimePickerOpen(false);
        }}
        visible={timePickerOpen}
      />
    </View>
  );
}

function TimePickerSheet({
  initialValue,
  onClose,
  onSave,
  visible,
}: {
  initialValue: string;
  onClose: () => void;
  onSave: (time: string) => void;
  visible: boolean;
}) {
  const [hour, setHour] = useState(initialValue.slice(0, 2));
  const [minute, setMinute] = useState(initialValue.slice(5, 7));
  const [period, setPeriod] = useState(initialValue.slice(-2));
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="Close time picker"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Daily nudge time</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetDescription}>
            Choose a time that works for your day.
          </Text>
          <View style={styles.pickerRow}>
            <PickerColumn
              label="Hour"
              options={["07", "08", "09", "10", "11", "12"]}
              selected={hour}
              onSelect={setHour}
            />
            <Text style={styles.timeDivider}>:</Text>
            <PickerColumn
              label="Minute"
              options={["00", "15", "30", "45"]}
              selected={minute}
              onSelect={setMinute}
            />
            <PickerColumn
              label="Period"
              options={["AM", "PM"]}
              selected={period}
              onSelect={setPeriod}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave(`${hour} : ${minute} ${period}`)}
            style={({ pressed }) => [
              styles.sheetButton,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={["#0878FF", "#0068FF", "#00D5F5"]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.sheetGradient}
            >
              <Text style={styles.buttonText}>Save time</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PickerColumn({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: string[];
  selected: string;
}) {
  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === option }}
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.pickerOption,
              selected === option && styles.pickerOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.pickerOptionText,
                selected === option && styles.pickerOptionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function ProjectStep({
  deadline,
  error,
  name,
  onChangeDeadline,
  onChangeName,
  onChangeRepository,
  onContinue,
  repository,
}: {
  deadline: string;
  error: string | null;
  name: string;
  onChangeDeadline: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeRepository: (value: string) => void;
  onContinue: () => void;
  repository: string;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [repoFocused, setRepoFocused] = useState(false);
  const repositories = useQuery(api.github.listRepositories, {});
  const connection = useQuery(api.github.getConnection, {});
  const suggestions = (repositories || [])
    .filter((item) => `${item.fullName} ${item.url}`.toLowerCase().includes(repository.toLowerCase()))
    .slice(0, 3);
  return (
    <View style={styles.projectStep}>
      <View style={styles.projectIcon}>
        <FontAwesome color="#D9EDFF" name="code" size={20} />
      </View>
      <Text style={styles.projectTitle}>Add your first project</Text>
      <Text style={styles.projectSubtitle}>Let’s get you started.</Text>
      <Text style={styles.projectLabel}>Project name</Text>
      <TextInput
        accessibilityLabel="Project name"
        onChangeText={onChangeName}
        placeholder="e.g. MyApp"
        placeholderTextColor="#8FB5E6"
        selectionColor={Palette.cyan}
        style={styles.projectInput}
        value={name}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.projectLabel}>GitHub repo URL</Text>
      <View style={styles.repoInput}>
        <TextInput
          accessibilityLabel="GitHub repository URL"
          autoCapitalize="none"
          autoCorrect={false}
          onBlur={() => setTimeout(() => setRepoFocused(false), 150)}
          onChangeText={onChangeRepository}
          onFocus={() => setRepoFocused(true)}
          placeholder="https://github.com/username/repo"
          placeholderTextColor="#78A8DB"
          selectionColor={Palette.cyan}
          style={styles.repoTextInput}
          value={repository}
        />
        {connection?.state === "connected" ? <Pressable accessibilityLabel="Browse connected repositories" accessibilityRole="button" onPress={() => setRepoPickerOpen(true)}><Text style={styles.paste}>Browse</Text></Pressable> : null}
      </View>
      {repoFocused && connection?.state === "connected" && suggestions.length ? <View style={styles.inlineSuggestions}>{suggestions.map((item) => <Pressable accessibilityRole="button" key={item._id} onPress={() => { onChangeRepository(item.url); setRepoFocused(false); }} style={styles.inlineSuggestion}><Text numberOfLines={1} style={styles.inlineSuggestionName}>{item.fullName}</Text><Text style={styles.inlineSuggestionType}>{item.visibility}</Text></Pressable>)}</View> : null}
      {connection?.state === "connected" ? (
        <View style={styles.connected}>
          <FontAwesome color="#00E0BD" name="check-circle" size={14} />
          <Text style={styles.connectedText}>Connected</Text>
          <Text style={styles.connectedCheck}>✓</Text>
        </View>
      ) : null}
      <Text style={styles.projectLabel}>Optional deadline</Text>
      <Pressable
        accessibilityLabel="Select optional project deadline"
        accessibilityRole="button"
        onPress={() => setDatePickerOpen(true)}
        style={styles.deadline}
      >
        <Text
          style={[styles.deadlineText, deadline && styles.deadlineSelected]}
        >
          {deadline || "Select date"}
        </Text>
        <FontAwesome color="#8FC8FF" name="calendar" size={15} />
      </Pressable>
      <PrimaryAction label="Add Project" onPress={onContinue} />
      <DeadlineSheet
        onClose={() => setDatePickerOpen(false)}
        onSave={(value) => {
          onChangeDeadline(value);
          setDatePickerOpen(false);
        }}
        visible={datePickerOpen}
      />
      <RepositorySheet
        onClose={() => setRepoPickerOpen(false)}
        onSelect={(value) => {
          onChangeRepository(value);
          setRepoPickerOpen(false);
        }}
        repositories={repositories || []}
        visible={repoPickerOpen}
      />
    </View>
  );
}
function RepositorySheet({
  onClose,
  onSelect,
  repositories,
  visible,
}: {
  onClose: () => void;
  onSelect: (value: string) => void;
  repositories: Array<{
    _id: string;
    fullName: string;
    url: string;
    visibility: "public" | "private";
  }>;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="Close repository picker"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select repository</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetDescription}>
            {repositories.length
              ? "Choose a repository from your connected GitHub account."
              : "No repositories found yet."}
          </Text>
          <View style={styles.repositoryOptions}>
            {repositories.map((repository) => (
              <Pressable
                accessibilityRole="button"
                key={repository._id}
                onPress={() => onSelect(repository.url)}
                style={styles.repositoryOption}
              >
                <Text style={styles.repositoryName}>{repository.fullName}</Text>
                <Text style={styles.repositoryVisibility}>
                  {repository.visibility}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DeadlineSheet({
  onClose,
  onSave,
  visible,
}: {
  onClose: () => void;
  onSave: (value: string) => void;
  visible: boolean;
}) {
  const [selected, setSelected] = useState("Tomorrow");
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="Close deadline picker"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Optional deadline</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetDescription}>
            Choose a date to help keep this project on track.
          </Text>
          <View style={styles.deadlineOptions}>
            {["Tomorrow", "In one week", "In one month"].map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selected === option }}
                key={option}
                onPress={() => setSelected(option)}
                style={[
                  styles.deadlineOption,
                  selected === option && styles.deadlineOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.deadlineOptionText,
                    selected === option && styles.deadlineOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
                <View
                  style={[styles.radio, selected === option && styles.radioOn]}
                >
                  {selected === option ? (
                    <View style={styles.radioDot} />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave(selected)}
            style={({ pressed }) => [
              styles.sheetButton,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={["#0878FF", "#0068FF", "#00D5F5"]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.sheetGradient}
            >
              <Text style={styles.buttonText}>Save deadline</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function ReadyScreen({
  onFinish,
  saving,
}: {
  onFinish: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#031A36", "#030E20", "#020914"]}
        end={{ x: 0.72, y: 1 }}
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.readyFinal}>
          <Image
            accessibilityLabel="Project setup complete"
            contentFit="contain"
            source={require("@/assets/set-tick.png")}
            style={styles.readyArtwork}
          />
          <Text style={styles.readyFinalTitle}>You’re set.</Text>
          <Text style={styles.readyFinalCopy}>
            Your mission: finish ONE project.
          </Text>
          <Text style={styles.readyFinalHint}>Small steps. Big results.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={onFinish}
            style={({ pressed }) => [
              styles.readyButton,
              (pressed || saving) && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={["#0878FF", "#0068FF", "#00D5F5"]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {saving ? "Saving…" : "Explore DevTask"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
function PrimaryAction({
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
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={["#0878FF", "#0068FF", "#00D5F5"]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={styles.buttonGradient}
      >
        <Text style={styles.buttonText}>{label}</Text>
        <Text style={styles.arrow}>→</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020914" },
  safe: { flex: 1 },
  content: { padding: 28, paddingBottom: 30 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  back: {
    color: "#F2F8FF",
    fontFamily: FontFamily.regular,
    fontSize: 44,
    lineHeight: 36,
  },
  progress: { flex: 1, flexDirection: "row", gap: 4 },
  progressSegment: {
    height: 7,
    flex: 1,
    borderRadius: 99,
    backgroundColor: "#14355D",
  },
  progressActive: { backgroundColor: "#00A7FF" },
  count: { color: "#8FC8FF", fontFamily: FontFamily.medium, fontSize: 13 },
  step: { paddingTop: 42 },
  github: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#0A2449",
  },
  circleIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: "#0958B8",
  },
  title: {
    marginTop: 18,
    color: "#F7FAFF",
    fontFamily: FontFamily.bold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 8,
    color: "#B1D2FF",
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 23,
  },
  connectionCard: {
    minHeight: 76,
    marginTop: 30,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#007BDC",
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  connectionCopy: { gap: 2 },
  connectionTitle: {
    color: "#EEF7FF",
    fontFamily: FontFamily.medium,
    fontSize: 16,
  },
  connectionDescription: {
    color: "#8FC8FF",
    fontFamily: FontFamily.regular,
    fontSize: 13,
  },
  security: {
    marginTop: 24,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 12,
  },
  securityText: {
    flex: 1,
    color: "#A9CFFB",
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: 28,
    color: "#D7EAFF",
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  time: {
    height: 62,
    marginTop: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 15,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  timeText: { color: "#DDEEFF", fontFamily: FontFamily.mono, fontSize: 22 },
  am: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: "#CBE5FF",
    backgroundColor: "#163F70",
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  chevron: { marginLeft: "auto", color: "#9ECFFF", fontSize: 23 },
  option: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor: "#075EA9",
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  optionFirst: { borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  optionIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0C5675",
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    flex: 1,
    color: "#EDF6FF",
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  optionHint: { color: "#00DDBE", fontFamily: FontFamily.medium, fontSize: 11 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#5C91D4",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: "#00A7FF" },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#00A7FF",
  },
  singleInput: {
    height: 56,
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#EDF6FF",
    fontFamily: FontFamily.regular,
    fontSize: 16,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  repo: {
    minHeight: 56,
    marginTop: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 14,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  button: {
    marginTop: 38,
    borderRadius: 27,
    shadowColor: "#00BBFF",
    shadowOpacity: 0.48,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  buttonGradient: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 20,
  },
  buttonText: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 17 },
  arrow: { color: "#FFF", fontSize: 27 },
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 7, 18, .66)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#135A9E",
    backgroundColor: "#061A34",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4774A8",
  },
  sheetHeader: {
    marginTop: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: "#F7FAFF", fontFamily: FontFamily.bold, fontSize: 21 },
  cancel: { color: "#00BDFF", fontFamily: FontFamily.semibold, fontSize: 15 },
  sheetDescription: {
    marginTop: 7,
    color: "#A9CFFB",
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  pickerRow: {
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pickerColumn: { flex: 1 },
  pickerLabel: {
    marginBottom: 9,
    color: "#8FC8FF",
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  pickerOptions: {
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#075EA9",
    backgroundColor: "#04172E",
  },
  pickerOption: {
    minHeight: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOptionSelected: { backgroundColor: "#075EBA" },
  pickerOptionText: {
    color: "#9FC8F4",
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  pickerOptionTextSelected: { color: "#FFF", fontFamily: FontFamily.bold },
  timeDivider: {
    marginTop: 19,
    color: "#C5E4FF",
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  sheetButton: { marginTop: 27, borderRadius: 27 },
  sheetGradient: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  ready: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  readyMark: {
    width: 113,
    height: 113,
    borderRadius: 57,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#00D1FF",
    backgroundColor: "#073E76",
    shadowColor: "#00D1FF",
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  readyCheck: {
    color: "#14D9FF",
    fontFamily: FontFamily.extraBold,
    fontSize: 75,
    lineHeight: 80,
  },
  readyTitle: {
    marginTop: 59,
    color: "#F7FAFF",
    fontFamily: FontFamily.extraBold,
    fontSize: 38,
    lineHeight: 45,
    letterSpacing: -1.2,
  },
  readyCopy: {
    marginTop: 17,
    color: "#E4F2FF",
    fontFamily: FontFamily.regular,
    fontSize: 17,
  },
  readyHint: {
    marginTop: 11,
    color: "#9BC7F7",
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  projectStep: { flex: 1, paddingTop: 23 },
  projectIcon: {
    width: 49,
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "#17345F",
  },
  projectTitle: {
    marginTop: 11,
    color: "#F7FAFF",
    fontFamily: FontFamily.bold,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.65,
  },
  projectSubtitle: {
    marginTop: 4,
    color: "#B1D2FF",
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  projectLabel: {
    marginTop: 18,
    color: "#D7EAFF",
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  projectInput: {
    height: 47,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 11,
    paddingHorizontal: 13,
    color: "#EDF6FF",
    fontFamily: FontFamily.regular,
    fontSize: 13,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  error: {
    marginTop: 7,
    color: "#FF9DA5",
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  repoInput: {
    height: 43,
    marginTop: 6,
    paddingLeft: 12,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 10,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  repoTextInput: {
    flex: 1,
    height: 45,
    padding: 0,
    color: "#EDF6FF",
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  inlineSuggestions: {
    overflow: "hidden",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#1765A8",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#062A54",
  },
  inlineSuggestion: {
    minHeight: 38,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#164675",
  },
  inlineSuggestionName: { flex: 1, color: "#E5F3FF", fontFamily: FontFamily.medium, fontSize: 10 },
  inlineSuggestionType: { color: "#79C5F5", fontFamily: FontFamily.regular, fontSize: 9 },
  repoPlaceholder: {
    flex: 1,
    color: "#78A8DB",
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  repoSelected: { color: "#E8F5FF" },
  paste: { color: "#00BDFF", fontFamily: FontFamily.semibold, fontSize: 10 },
  connected: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    backgroundColor: "rgba(0, 204, 150, .18)",
  },
  connectedText: {
    color: "#00DDBE",
    fontFamily: FontFamily.medium,
    fontSize: 10,
  },
  connectedCheck: {
    color: "#00DDBE",
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  deadline: {
    height: 43,
    marginTop: 6,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#007BDC",
    borderRadius: 10,
    backgroundColor: "rgba(3, 40, 86, .58)",
  },
  deadlineText: {
    color: "#8FB5E6",
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  deadlineSelected: { color: "#EDF6FF" },
  deadlineOptions: {
    marginTop: 22,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#075EA9",
  },
  deadlineOption: {
    height: 51,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#04172E",
  },
  deadlineOptionSelected: { backgroundColor: "#073C75" },
  deadlineOptionText: {
    color: "#B6D6F6",
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  deadlineOptionTextSelected: { color: "#FFF", fontFamily: FontFamily.bold },
  repositoryOptions: {
    marginTop: 16,
    maxHeight: 240,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#075EA9",
  },
  repositoryOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#164675",
    backgroundColor: "#04172E",
  },
  repositoryName: {
    flex: 1,
    color: "#DDEEFF",
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  repositoryVisibility: {
    color: "#77BFFF",
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  readyFinal: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    paddingTop: 92,
    paddingBottom: 25,
  },
  readyArtwork: { width: 238, height: 238 },
  readyFinalTitle: {
    marginTop: 35,
    color: "#F7FAFF",
    fontFamily: FontFamily.extraBold,
    fontSize: 38,
    lineHeight: 45,
    letterSpacing: -1.2,
  },
  readyFinalCopy: {
    marginTop: 17,
    color: "#E4F2FF",
    fontFamily: FontFamily.regular,
    fontSize: 17,
  },
  readyFinalHint: {
    marginTop: 11,
    color: "#9BC7F7",
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  readyButton: {
    alignSelf: "stretch",
    marginTop: "auto",
    borderRadius: 27,
    shadowColor: "#00BBFF",
    shadowOpacity: 0.48,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
});

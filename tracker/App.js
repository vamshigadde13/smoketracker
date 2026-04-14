import { useEffect, useMemo, useState } from "react";
import { AppState, Modal, Pressable, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { PresetsScreen } from "./src/screens/PresetsScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { AddEntryModal } from "./src/components/AddEntryModal";
import {
  addPreset,
  addSmokeEntry,
  deletePreset,
  deleteSmokeEntry,
  getBrands,
  getNotificationSettings,
  getPresets,
  getProfile,
  getSmokeEntries,
  saveNotificationSettings,
  saveProfile,
  updatePreset,
  updateSmokeEntry,
  flushSyncQueue,
  getSyncStatus,
} from "./src/services/storage";
import { getLoggedInUserProfile } from "./src/services/authProfile";
import {
  getNotificationPermissionStatusAsync,
  requestNotificationPermissionAsync,
  syncNotificationSchedulesAsync,
} from "./src/services/notifications";

const Tab = createBottomTabNavigator();

function AppContent() {
  const { isAuthenticated, loading: authLoading, refreshAuth, logout } = useAuth();
  const [entries, setEntries] = useState([]);
  const [brands, setBrands] = useState([]);
  const [presets, setPresets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState("undetermined");
  const [modalVisible, setModalVisible] = useState(false);
  const [presetsVisible, setPresetsVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const refreshData = async ({ withQueueFlush = true } = {}) => {
    if (!isAuthenticated) {
      setEntries([]);
      setBrands([]);
      setPresets([]);
      setProfile(null);
      setNotificationSettings(null);
      setModalVisible(false);
      setPresetsVisible(false);
      setSyncStatus(await getSyncStatus());
      return;
    }

    if (withQueueFlush) {
      await flushSyncQueue();
    }

    const [allEntries, allBrands, allPresets, userProfile, notif, authUser] = await Promise.all([
      getSmokeEntries(),
      getBrands(),
      getPresets(),
      getProfile(),
      getNotificationSettings(),
      getLoggedInUserProfile(),
    ]);
    const mergedProfile =
      authUser?.name && authUser.name !== userProfile.name
        ? { ...userProfile, name: authUser.name }
        : userProfile;
    console.log("[ProfileNameDebug][App] userProfile.name:", userProfile?.name);
    console.log("[ProfileNameDebug][App] authUser.name:", authUser?.name);
    console.log("[ProfileNameDebug][App] mergedProfile.name:", mergedProfile?.name);
    if (mergedProfile !== userProfile) {
      await saveProfile(mergedProfile);
      console.log("[ProfileNameDebug][App] saved merged profile name");
    }
    setEntries(allEntries);
    setBrands(allBrands);
    setPresets(allPresets);
    setProfile(mergedProfile);
    setNotificationSettings(notif);
    setSyncStatus(await getSyncStatus());
  };

  useEffect(() => {
    if (authLoading) return;
    void refreshData();
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isAuthenticated) {
        void refreshData({ withQueueFlush: true });
      }
    });
    return () => sub?.remove?.();
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => setNotificationPermissionStatus(await getNotificationPermissionStatusAsync()))();
  }, []);

  useEffect(() => {
    if (!notificationSettings || notificationSettings.permissionAsked) return;
    (async () => {
      const asked = await saveNotificationSettings({ ...notificationSettings, permissionAsked: true });
      setNotificationSettings(asked);
      setNotificationPermissionStatus(await requestNotificationPermissionAsync());
    })();
  }, [notificationSettings]);

  useEffect(() => {
    if (!notificationSettings) return;
    void syncNotificationSchedulesAsync({
      settings: notificationSettings,
      entries,
      permissionStatus: notificationPermissionStatus,
    });
  }, [notificationSettings, entries, notificationPermissionStatus]);

  const tabScreenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: "#111827",
      tabBarInactiveTintColor: "#6b7280",
      tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
    }),
    []
  );

  const handleAddEntry = async (payload) => {
    await addSmokeEntry(payload);
    await refreshData();
    setModalVisible(false);
  };
  const handleQuickLog = async ({ brand, quantity = 1, cost }) => {
    await addSmokeEntry({ brand, quantity, timestamp: Date.now(), cost });
    await refreshData();
  };
  const handleCreatePreset = async (payload) => {
    await addPreset(payload);
    await refreshData();
  };
  const handleUpdatePreset = async (payload) => {
    await updatePreset(payload);
    await refreshData();
  };
  const handleDeletePreset = async (id) => {
    await deletePreset(id);
    await refreshData();
  };
  const handleDeleteEntry = async (id) => {
    await deleteSmokeEntry(id);
    await refreshData();
  };
  const handleUpdateEntry = async (payload) => {
    await updateSmokeEntry(payload);
    await refreshData();
  };
  const handleUpdateNotificationSettings = async (partial) => {
    const base = notificationSettings || (await getNotificationSettings());
    const next = await saveNotificationSettings({ ...base, ...partial });
    setNotificationSettings(next);
  };
  const handleRequestNotificationPermission = async () => {
    setNotificationPermissionStatus(await requestNotificationPermissionAsync());
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {authLoading ? (
          <View className="flex-1 items-center justify-center bg-gray-50">
            <Text className="text-gray-500">Loading...</Text>
          </View>
        ) : !isAuthenticated ? (
          <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
            <Tab.Screen name="Login">
              {() => <LoginScreen onLoginSuccess={async () => {
                await refreshAuth();
                await refreshData();
              }} />}
            </Tab.Screen>
            <Tab.Screen name="Register" component={RegisterScreen} />
          </Tab.Navigator>
        ) : (
          <>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                ...tabScreenOptions,
                tabBarIcon: ({ color, size, focused }) => {
                  const iconMap = {
                    Home: focused ? "home" : "home-outline",
                    Journal: focused ? "book" : "book-outline",
                    Profile: focused ? "person" : "person-outline",
                  };
                  return <Ionicons name={iconMap[route.name] || "ellipse-outline"} size={size} color={color} />;
                },
              })}
            >
              <Tab.Screen name="Home">
                {() => (
                  <HomeScreen
                    entries={entries}
                    presets={presets}
                    profile={profile}
                    onOpenAddModal={() => setModalVisible(true)}
                    onQuickLog={handleQuickLog}
                    onRefresh={refreshData}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Journal">
                {() => (
                  <JournalScreen
                    entries={entries}
                    brands={brands}
                    onRefresh={refreshData}
                    onDeleteEntry={handleDeleteEntry}
                    onUpdateEntry={handleUpdateEntry}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name="Profile">
                {() => (
                  <ProfileScreen
                    onProfileSaved={refreshData}
                    onLoggedOut={async () => {
                      await logout();
                      await refreshData();
                    }}
                    entries={entries}
                    notificationSettings={notificationSettings}
                    notificationPermissionStatus={notificationPermissionStatus}
                    onUpdateNotificationSettings={handleUpdateNotificationSettings}
                    onRequestNotificationPermission={handleRequestNotificationPermission}
                    logCount={entries.length}
                    brandCount={brands.length}
                    presetCount={presets.length}
                    syncStatus={syncStatus}
                    onSyncNow={() => refreshData({ withQueueFlush: true })}
                  />
                )}
              </Tab.Screen>
            </Tab.Navigator>
            <AddEntryModal
              visible={modalVisible}
              brands={brands}
              presets={presets}
              onOpenPresets={() => {
                setModalVisible(false);
                setPresetsVisible(true);
              }}
              onClose={() => setModalVisible(false)}
              onSave={handleAddEntry}
            />
            <Modal visible={presetsVisible} animationType="slide" onRequestClose={() => setPresetsVisible(false)}>
              <View className="flex-1 bg-gray-50">
                <View className="px-5 pb-3 pt-4">
                  <Pressable className="self-start rounded-lg bg-gray-200 px-3 py-2" onPress={() => setPresetsVisible(false)}>
                    <Text className="font-semibold text-gray-700">Done</Text>
                  </Pressable>
                </View>
                <PresetsScreen
                  presets={presets}
                  onCreatePreset={handleCreatePreset}
                  onUpdatePreset={handleUpdatePreset}
                  onDeletePreset={handleDeletePreset}
                />
              </View>
            </Modal>
          </>
        )}
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

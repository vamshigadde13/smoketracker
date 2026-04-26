import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform, Keyboard, Dimensions, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../api.js';

// Optional imports - handle gracefully if not available
let checkUserGuideStatus = async () => false;
let markUserGuideCompleted = async () => { };
let SignInHeader = null;

// Try to import GuideUtils if available
try {
    const GuideUtilsModule = require('./Guide/GuideUtils');
    if (GuideUtilsModule?.checkUserGuideStatus) {
        checkUserGuideStatus = GuideUtilsModule.checkUserGuideStatus;
    }
    if (GuideUtilsModule?.markUserGuideCompleted) {
        markUserGuideCompleted = GuideUtilsModule.markUserGuideCompleted;
    }
} catch (e) {
    // GuideUtils not available - using stub functions
    console.log('GuideUtils not available');
}


// Create axios instance with interceptor
const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add request interceptor
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userData');
            // You might want to navigate to login screen here
        }
        return Promise.reject(error);
    }
);

const LoginScreen = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);
    const [welcomeOpacity] = useState(new Animated.Value(0));
    const [isNewUser, setIsNewUser] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetLoginId, setResetLoginId] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();

    useEffect(() => {
        const prefilled = route?.params?.prefilledUsername;
        if (prefilled && !username) {
            setUsername(String(prefilled));
        }
    }, [route?.params?.prefilledUsername, username]);

    const storeUserData = async (user) => {
        try {
            await AsyncStorage.setItem("userData", JSON.stringify(user));
        } catch (error) {
            console.error("Error storing user data:", error);
        }
    };

    const showWelcomeMessage = async () => {
        setShowWelcome(true);
        Animated.sequence([
            Animated.timing(welcomeOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(1000),
            Animated.timing(welcomeOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(async () => {
            setShowWelcome(false);

            try {
                // Get token from AsyncStorage
                const token = await AsyncStorage.getItem('token');
                let guideCompleted = false;

                // Check if user is new by checking if guide is completed
                const localGuideCompleted = await checkUserGuideStatus();
                setIsNewUser(!localGuideCompleted);

                if (token) {
                    try {
                        // Check server-side user guide completion status with timeout
                        const response = await Promise.race([
                            api.get('/api/v1/user/user'),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Request timeout')), 5000)
                            )
                        ]);

                        if (response.data && response.data.user) {
                            guideCompleted = response.data.user.userGuideCompleted || false;
                            console.log('Server guide status:', guideCompleted);
                            // If server says guide is completed, also update local storage
                            if (guideCompleted) {
                                await markUserGuideCompleted();
                            }
                        }
                    } catch (error) {
                        console.error('Error checking server user guide status:', error);
                        // Fallback to local storage check
                        guideCompleted = await checkUserGuideStatus();
                        console.log('Fallback to local guide status:', guideCompleted);
                    }
                } else {
                    // Fallback to local storage check
                    guideCompleted = await checkUserGuideStatus();
                    console.log('No token, using local guide status:', guideCompleted);
                }

                // Navigate based on guide completion
                // Note: userGuideCompleted field may not exist in new model, adjust as needed
                if (onLoginSuccess) {
                    await onLoginSuccess();
                    return;
                }
                if (navigation?.replace) {
                    navigation.replace('HomePage');
                }
            } catch (error) {
                console.error('Error in showWelcomeMessage:', error);
                // Navigate to home page as fallback
                if (onLoginSuccess) {
                    await onLoginSuccess();
                    return;
                }
                if (navigation?.replace) {
                    navigation.replace('HomePage');
                }
            }
        });
    };

    const validateForm = () => {
        if (!username.trim()) {
            setError('Username is required');
            return false;
        }
        if (!password) {
            setError('Password is required');
            return false;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const response = await api.post('/api/v1/user/login', {
                username: username.trim(),
                password: password
            });

            console.log('Login response:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Login failed');
            }

            // Store both token and user data from server response
            await AsyncStorage.setItem('token', response.data.token);
            await storeUserData(response.data.user);

            // Log user data and token
            console.log('User Data:', response.data.user);
            console.log('Token:', response.data.token);

            // Show welcome message with animation
            showWelcomeMessage();
        } catch (error) {
            console.error("Login error:", error);
            let errorMessage = "Login failed";

            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = "User not found. Please register first.";
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetLoginId.trim()) {
            Alert.alert('Missing info', 'Enter username or user ID.');
            return;
        }
        if (!resetPassword || resetPassword.length < 6) {
            Alert.alert('Invalid password', 'New password must be at least 6 characters.');
            return;
        }
        try {
            setResetLoading(true);
            const response = await api.post('/api/v1/user/forgot-password', {
                loginId: resetLoginId.trim(),
                newPassword: resetPassword,
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Reset failed');
            }
            Alert.alert('Password reset', 'Password updated. Please login with your new password.');
            setShowForgotPassword(false);
            setResetLoginId('');
            setResetPassword('');
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Unable to reset password';
            Alert.alert('Reset failed', message);
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Welcome Message Overlay */}
            {showWelcome && (
                <Animated.View style={[styles.welcomeOverlay, { opacity: welcomeOpacity }]}>
                    <View style={styles.welcomeMessage}>
                        <Ionicons name="checkmark-circle" size={48} color="#111827" />
                        <Text style={styles.welcomeText}>
                            {isNewUser ? "Welcome to PickleMatch!" : "Welcome Back!"}
                        </Text>
                        <Text style={styles.welcomeSubtext}>
                            {isNewUser ? "Let's get started" : "Login successful"}
                        </Text>
                    </View>
                </Animated.View>
            )}

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.card}>
                        <View style={styles.welcomeSection}>
                            {SignInHeader && (
                                <View style={styles.headerImageContainer}>
                                    <SignInHeader width={width * 0.5} height={45} />
                                </View>
                            )}
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Smoke Tracker</Text>
                            </View>
                            <Text style={styles.title}>Welcome back</Text>
                            <Text style={styles.subtitle}>Sign in to continue your journal and streaks.</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="user" size={20} color="#374151" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#9ca3af"
                                    value={username}
                                    onChangeText={(text) => {
                                        setUsername(text);
                                        setError('');
                                    }}
                                    autoCapitalize="none"
                                    onBlur={() => Keyboard.dismiss()}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="lock" size={20} color="#374151" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9ca3af"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setError('');
                                    }}
                                    secureTextEntry={!isPasswordVisible}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                    style={styles.eyeIcon}
                                >
                                    <Feather
                                        name={isPasswordVisible ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#374151"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, (isLoading || !username.trim() || !password) && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading || !username.trim() || !password}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={(isLoading || !username.trim() || !password) ? ['#9ca3af', '#6b7280'] : ['#111827', '#1f2937']}
                                style={styles.buttonGradient}
                            >
                                <View style={styles.buttonContent}>
                                    {isLoading && <Ionicons name="hourglass-outline" size={20} color="#ffffff" style={styles.buttonIcon} />}
                                    <Text style={styles.buttonText}>
                                        {isLoading ? 'Signing In...' : 'Sign In'}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowForgotPassword(true)}
                            activeOpacity={0.7}
                            style={styles.forgotLinkWrap}
                        >
                            <Text style={styles.forgotLink}>Forgot password?</Text>
                        </TouchableOpacity>

                        <View style={styles.linkContainer}>
                            <Text style={styles.linkText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => {
                                if (navigation?.navigate) {
                                    navigation.navigate('Register');
                                }
                            }} activeOpacity={0.7}>
                                <Text style={styles.link}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal transparent animationType="fade" visible={showForgotPassword} onRequestClose={() => setShowForgotPassword(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Reset password</Text>
                        <Text style={styles.modalSubtitle}>Use username or user ID, then set a new password.</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Username or user ID"
                            placeholderTextColor="#9ca3af"
                            value={resetLoginId}
                            onChangeText={setResetLoginId}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="New password"
                            placeholderTextColor="#9ca3af"
                            value={resetPassword}
                            onChangeText={setResetPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowForgotPassword(false)} disabled={resetLoading}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleResetPassword} disabled={resetLoading}>
                                <Text style={styles.modalConfirmText}>{resetLoading ? 'Resetting...' : 'Reset'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    keyboardContainer: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 30,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    badge: {
        marginBottom: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        letterSpacing: 0.4,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    headerImageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#d1d5db',
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: 'transparent',
    },
    icon: {
        marginRight: 12,
    },
    button: {
        borderRadius: 16,
        marginTop: 24,
        marginBottom: 16,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonGradient: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    buttonDisabled: {
        shadowOpacity: 0.1,
    },
    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    linkText: {
        color: '#6b7280',
        fontSize: 15,
    },
    link: {
        color: '#111827',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 4,
    },
    forgotLinkWrap: {
        alignSelf: 'flex-end',
        marginTop: -4,
        marginBottom: 8,
    },
    forgotLink: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '600',
    },
    error: {
        color: '#ef4444',
        fontSize: 15,
        marginBottom: 16,
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 8,
    },
    welcomeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    welcomeMessage: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 16,
        minWidth: 280,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    welcomeSubtext: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    modalSubtitle: {
        marginTop: 4,
        marginBottom: 12,
        color: '#6b7280',
        fontSize: 13,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        color: '#111827',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    modalCancelBtn: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
    },
    modalCancelText: {
        color: '#374151',
        fontWeight: '600',
    },
    modalConfirmBtn: {
        backgroundColor: '#111827',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: '700',
    },
});

export default LoginScreen;
export { LoginScreen };

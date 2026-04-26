import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform, Keyboard, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../api.js';

const RegisterScreen = () => {
    const [username, setUsername] = useState('');
    const [uniqueCodeDigits, setUniqueCodeDigits] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);
    const [welcomeOpacity] = useState(new Animated.Value(0));

    let navigation;
    try {
        navigation = useNavigation();
    } catch (error) {
        console.log('Navigation not available yet');
    }

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
            // Navigate to login or home screen
            if (navigation?.replace) {
                navigation.replace('Login', { prefilledUsername: username.trim() });
            }
        });
    };

    const validateForm = () => {
        if (!username.trim()) {
            setError('Username is required');
            return false;
        }
        const normalizedDigits = uniqueCodeDigits.trim();
        if (!normalizedDigits) {
            setError('Unique code number is required');
            return false;
        }
        if (!/^[0-9]{4}$/.test(normalizedDigits)) {
            setError('Unique code number must be 4 digits');
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

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const normalizedUsername = username.trim().toLowerCase();
            const fullUniqueCode = `${normalizedUsername}#${uniqueCodeDigits.trim()}`;

            const response = await axios.post(`${API_BASE_URL}/api/v1/user/register`, {
                username: normalizedUsername,
                uniqueCode: fullUniqueCode,
                password: password
            });

            console.log('Register response:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Registration failed');
            }

            // Store user data
            await storeUserData(response.data.user);

            // Log user data
            console.log('User Data:', response.data.user);

            // Show welcome message with animation
            showWelcomeMessage();
        } catch (error) {
            console.error("Registration error:", error);
            let errorMessage = "Registration failed";

            if (error.response) {
                if (error.response.status === 409) {
                    errorMessage = error.response.data.message || "User already exists";
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data?.errors) {
                    errorMessage = error.response.data.errors.join(', ');
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* Welcome Message Overlay */}
            {showWelcome && (
                <Animated.View style={[styles.welcomeOverlay, { opacity: welcomeOpacity }]}>
                    <View style={styles.welcomeMessage}>
                        <Ionicons name="checkmark-circle" size={48} color="#111827" />
                        <Text style={styles.welcomeText}>Account Created!</Text>
                        <Text style={styles.welcomeSubtext}>Please sign in to continue</Text>
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
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Smoke Tracker</Text>
                            </View>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Create your account and start tracking smarter.</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="user" size={20} color="#374151" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Choose a username"
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
                            <Text style={styles.inputLabel}>Unique code</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="hash" size={20} color="#374151" style={styles.icon} />
                                <Text style={styles.codePrefix}>
                                    {(username.trim().toLowerCase() || 'username') + '#'}
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="4821"
                                    placeholderTextColor="#9ca3af"
                                    value={uniqueCodeDigits}
                                    onChangeText={(text) => {
                                        const digitsOnly = String(text || '').replace(/[^0-9]/g, '').slice(0, 4);
                                        setUniqueCodeDigits(digitsOnly);
                                        setError('');
                                    }}
                                    keyboardType="number-pad"
                                    autoCapitalize="none"
                                    onBlur={() => Keyboard.dismiss()}
                                />
                            </View>
                            <Text style={styles.helperText}>Username is fixed, enter only 4 digits</Text>
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
                            style={[styles.button, (isLoading || !username.trim() || uniqueCodeDigits.trim().length !== 4 || !password) && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading || !username.trim() || uniqueCodeDigits.trim().length !== 4 || !password}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={(isLoading || !username.trim() || uniqueCodeDigits.trim().length !== 4 || !password) ? ['#9ca3af', '#6b7280'] : ['#111827', '#1f2937']}
                                style={styles.buttonGradient}
                            >
                                <View style={styles.buttonContent}>
                                    {isLoading && <Ionicons name="hourglass-outline" size={20} color="#ffffff" style={styles.buttonIcon} />}
                                    <Text style={styles.buttonText}>
                                        {isLoading ? 'Creating Account...' : 'Create Account'}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.linkContainer}>
                            <Text style={styles.linkText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.link}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
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
    helperText: {
        marginTop: 6,
        marginLeft: 6,
        fontSize: 12,
        color: '#6b7280',
    },
    codePrefix: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
        marginRight: 8,
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
});

export default RegisterScreen;
export { RegisterScreen };

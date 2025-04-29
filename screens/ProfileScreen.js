// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [difficulty, setDifficulty] = useState('normal');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDifficulty = await AsyncStorage.getItem('questionDifficulty');
        if (savedDifficulty) {
          setDifficulty(savedDifficulty);
        }

        const savedNotifications = await AsyncStorage.getItem('notifications');
        if (savedNotifications !== null) {
          setNotifications(savedNotifications === 'true');
        }

        const savedReminders = await AsyncStorage.getItem('studyReminders');
        if (savedReminders !== null) {
          setReminders(savedReminders === 'true');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: signOut,
          style: "destructive"
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    setLoading(true);

    try {
      // Save settings to AsyncStorage
      await AsyncStorage.setItem('questionDifficulty', difficulty);
      await AsyncStorage.setItem('notifications', notifications.toString());
      await AsyncStorage.setItem('studyReminders', reminders.toString());

      // Here you would implement the API call to update the user profile
      // For now, let's simulate a delay
      setTimeout(() => {
        setLoading(false);
        setIsEditing(false);
        Alert.alert("Success", "Profile and settings updated successfully");
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert("Error", "Failed to save settings");
      setLoading(false);
    }
  };

  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
  };

  if (loadingSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE7648" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileInitials}>
          <Text style={styles.initialsText}>
            {fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {isEditing ? (
        <View style={styles.editForm}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, { color: '#999' }]}
              value={email}
              editable={false}
              placeholder="Your email"
            />
            <Text style={styles.helperText}>
              Email cannot be changed
            </Text>
          </View>

          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Question Difficulty</Text>
          </View>

          <View style={styles.difficultyContainer}>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'easy' && styles.difficultyButtonActive
              ]}
              onPress={() => handleDifficultyChange('easy')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'easy' && styles.difficultyButtonTextActive
              ]}>Easy</Text>
              <Text style={styles.difficultyDescription}>Beginner-friendly questions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'normal' && styles.difficultyButtonActive
              ]}
              onPress={() => handleDifficultyChange('normal')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'normal' && styles.difficultyButtonTextActive
              ]}>Normal</Text>
              <Text style={styles.difficultyDescription}>Standard learning questions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'hard' && styles.difficultyButtonActive
              ]}
              onPress={() => handleDifficultyChange('hard')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'hard' && styles.difficultyButtonTextActive
              ]}>Hard</Text>
              <Text style={styles.difficultyDescription}>Exam-style challenging questions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Notifications</Text>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D1D1', true: '#FE7648' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Study Reminders</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ false: '#D1D1D1', true: '#FE7648' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.menuContainer}>
          <View style={styles.settingsSummary}>
            <Text style={styles.settingsTitle}>Current Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Question Difficulty:</Text>
              <Text style={[
                styles.settingValue,
                difficulty === 'easy' && styles.easyDifficulty,
                difficulty === 'normal' && styles.normalDifficulty,
                difficulty === 'hard' && styles.hardDifficulty,
              ]}>
                {difficulty === 'easy' ? 'Easy (Beginner)' :
                difficulty === 'normal' ? 'Normal' :
                'Hard (Exam-Style)'}
              </Text>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Notifications:</Text>
              <Text style={styles.settingValue}>{notifications ? 'On' : 'Off'}</Text>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Study Reminders:</Text>
              <Text style={styles.settingValue}>{reminders ? 'On' : 'Off'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setIsEditing(true)}>
            <Text style={styles.menuItemText}>Edit Profile & Settings</Text>
            <Text style={styles.menuItemIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SubtopicProgress', { tutor: 'biology' })}>
            <Text style={styles.menuItemText}>Learning Progress</Text>
            <Text style={styles.menuItemIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}>
            <Text style={styles.menuItemText}>Settings</Text>
            <Text style={styles.menuItemIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Text style={styles.menuItemIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.signOutItem]}
            onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FE7648',
  },
  profileInitials: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingVertical: 10,
  },
  settingsSummary: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  easyDifficulty: {
    color: '#FE7648',
  },
  normalDifficulty: {
    color: '#2196F3',
  },
  hardDifficulty: {
    color: '#F44336',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemIcon: {
    fontSize: 16,
    color: '#999',
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    fontSize: 16,
    color: '#F44336',
  },
  versionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  editForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    height: 50,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  sectionTitle: {
    marginBottom: 10,
    marginTop: 5,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  difficultyContainer: {
    marginBottom: 20,
  },
  difficultyButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  difficultyButtonActive: {
    borderColor: '#FE7648',
    backgroundColor: '#E8F5E9',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  difficultyButtonTextActive: {
    color: '#FE7648',
  },
  difficultyDescription: {
    fontSize: 12,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FE7648',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ProfileScreen;
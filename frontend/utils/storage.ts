// storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

export const storeToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('auth_token', token);
    console.log('✅ Token stored successfully');
  } catch (error) {
    console.log('❌ Error storing token:', error);
    throw error;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const verified_token = await api.post('/auth/verify', { token });
    if (verified_token.data.valid) {
      console.log("Token valid", verified_token.data.user);
      return token;
    }
    else {
      console.log("Invalid Token");
      await removeToken();
      return null;
    }
  }
  catch (error) {
    console.log("API call failed", error);
    return null;
  }

};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('auth_token');
    console.log('✅ Token removed successfully');

    // Verify removal
    const verify = await AsyncStorage.getItem('auth_token');
    console.log('🔍 Verification - token exists after removal:', !!verify);
  } catch (error) {
    console.error('❌ Error removing token:', error);
    throw error;
  }
};

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  USERNAME: 'username',
} as const;

export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
}

export async function saveAuthData(data: StoredAuthData): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, data.accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, data.refreshToken),
    SecureStore.setItemAsync(KEYS.USER_ID, data.userId),
    SecureStore.setItemAsync(KEYS.USERNAME, data.username),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function clearAuthData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER_ID),
    SecureStore.deleteItemAsync(KEYS.USERNAME),
  ]);
}

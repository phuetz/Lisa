/**
 * A simple utility for interacting with browser localStorage.
 */

/**
 * Saves a value to localStorage under a specific key.
 * The value is automatically converted to a JSON string.
 * @param key The key to save the data under.
 * @param value The value to save.
 */
export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error saving to localStorage for key "${key}":`, error);
  }
};

/**
 * Loads a value from localStorage by its key.
 * The value is automatically parsed from a JSON string.
 * @param key The key of the data to retrieve.
 * @returns The parsed data, or null if the key doesn't exist or an error occurs.
 */
export const loadFromStorage = <T>(key: string): T | null => {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return null;
    }
    return JSON.parse(serializedValue) as T;
  } catch (error) {
    console.error(`Error loading from localStorage for key "${key}":`, error);
    return null;
  }
};

/**
 * Removes a value from localStorage by its key.
 * @param key The key of the data to remove.
 */
export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage for key "${key}":`, error);
  }
};

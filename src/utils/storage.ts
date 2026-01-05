/**
 * Storage utility that handles tracking prevention and storage access issues
 */

type StorageType = 'localStorage' | 'sessionStorage' | 'fallback';

class StorageUtil {
  private availableStorage: StorageType | null = null;
  private fallbackStore: Map<string, string> = new Map();

  /**
   * Check which storage types are available and return the best option
   */
  private determineAvailableStorage(): StorageType {
    if (this.availableStorage !== null) {
      return this.availableStorage;
    }

    // Test localStorage first (preferred)
    if (this.testStorage(localStorage, 'localStorage')) {
      this.availableStorage = 'localStorage';
      return 'localStorage';
    }

    // Test sessionStorage as fallback
    if (this.testStorage(sessionStorage, 'sessionStorage')) {
      this.availableStorage = 'sessionStorage';
      console.warn('localStorage blocked by tracking prevention, using sessionStorage');
      return 'sessionStorage';
    }

    // Use fallback memory storage
    this.availableStorage = 'fallback';
    console.warn('Both localStorage and sessionStorage blocked, using in-memory fallback storage');
    return 'fallback';
  }

  /**
   * Test if a storage mechanism is available
   */
  private testStorage(storage: Storage, type: string): boolean {
    try {
      const testKey = `__${type}_test__`;
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      // Common tracking prevention errors
      if (error instanceof DOMException) {
        switch (error.code) {
          case 22: // QUOTA_EXCEEDED_ERR
            console.warn(`${type} quota exceeded`);
            break;
          case 18: // SECURITY_ERR
            console.warn(`${type} blocked by security policy (tracking prevention)`);
            break;
          default:
            console.warn(`${type} access denied:`, error.message);
        }
      } else {
        console.warn(`${type} test failed:`, error);
      }
      return false;
    }
  }

  /**
   * Get the appropriate storage object
   */
  private getStorage(): Storage | null {
    const storageType = this.determineAvailableStorage();
    switch (storageType) {
      case 'localStorage':
        return localStorage;
      case 'sessionStorage':
        return sessionStorage;
      case 'fallback':
      default:
        return null;
    }
  }

  /**
   * Set an item in storage
   */
  setItem(key: string, value: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, value);
      } else {
        this.fallbackStore.set(key, value);
      }
    } catch (error) {
      console.warn('Failed to set storage item, using fallback:', error);
      this.fallbackStore.set(key, value);
      // Reset storage detection to re-test on next access
      this.availableStorage = null;
    }
  }

  /**
   * Get an item from storage
   */
  getItem(key: string): string | null {
    try {
      const storage = this.getStorage();
      if (storage) {
        return storage.getItem(key);
      } else {
        return this.fallbackStore.get(key) || null;
      }
    } catch (error) {
      console.warn('Failed to get storage item, using fallback:', error);
      // Reset storage detection to re-test on next access
      this.availableStorage = null;
      return this.fallbackStore.get(key) || null;
    }
  }

  /**
   * Remove an item from storage
   */
  removeItem(key: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
      } else {
        this.fallbackStore.delete(key);
      }
    } catch (error) {
      console.warn('Failed to remove storage item, using fallback:', error);
      this.fallbackStore.delete(key);
      // Reset storage detection to re-test on next access
      this.availableStorage = null;
    }
  }

  /**
   * Clear all items from storage
   */
  clear(): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.clear();
      } else {
        this.fallbackStore.clear();
      }
    } catch (error) {
      console.warn('Failed to clear storage, using fallback:', error);
      this.fallbackStore.clear();
      // Reset storage detection to re-test on next access
      this.availableStorage = null;
    }
  }

  /**
   * Get the storage type being used
   */
  getStorageType(): StorageType {
    return this.determineAvailableStorage();
  }

  /**
   * Check if persistent storage is available
   */
  isPersistent(): boolean {
    const storageType = this.getStorageType();
    return storageType === 'localStorage';
  }

  /**
   * Display a user-friendly warning about storage limitations
   */
  getStorageWarning(): string | null {
    const storageType = this.getStorageType();
    switch (storageType) {
      case 'sessionStorage':
        return 'Your browser\'s tracking prevention is active. You\'ll need to log in again when you close your browser.';
      case 'fallback':
        return 'Your browser is blocking storage access. You\'ll need to log in again if you refresh the page.';
      case 'localStorage':
      default:
        return null;
    }
  }
}

// Create a singleton instance
export const storage = new StorageUtil();

// Export default for backward compatibility
export default storage;

import { GMAIL_LIMITS } from '../utils/constants.js';

/**
 * Rate limiter to prevent hitting Gmail API limits
 */
export class RateLimiter {
  constructor() {
    this.sentToday = 0;
    this.lastResetDate = new Date().toDateString();
    this.lastSendTime = 0;
    this.initialized = false;
    this.initPromise = this.loadFromStorage();
  }

  /**
   * Load rate limit data from storage
   */
  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(['sentToday', 'lastResetDate']);
      
      const today = new Date().toDateString();
      
      // Reset counter if it's a new day
      if (data.lastResetDate !== today) {
        this.sentToday = 0;
        this.lastResetDate = today;
        await this.saveToStorage();
      } else {
        this.sentToday = data.sentToday || 0;
        this.lastResetDate = data.lastResetDate || today;
      }
      
      this.initialized = true;
    } catch (e) {
      console.error('Error loading from storage:', e);
      this.initialized = true;
    }
  }

  /**
   * Ensure initialized before operations
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Save rate limit data to storage
   */
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        sentToday: this.sentToday,
        lastResetDate: this.lastResetDate
      });
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  /**
   * Check if we can send another email
   * @returns {boolean}
   */
  canSend() {
    return this.sentToday < GMAIL_LIMITS.MAX_PER_DAY;
  }

  /**
   * Get delay before next send (in ms)
   * @returns {number}
   */
  getDelay() {
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;
    
    if (timeSinceLastSend < GMAIL_LIMITS.DELAY_BETWEEN_SENDS) {
      return GMAIL_LIMITS.DELAY_BETWEEN_SENDS - timeSinceLastSend;
    }
    
    return 0;
  }

  /**
   * Wait before sending next email
   * @returns {Promise<void>}
   */
  async wait() {
    await this.ensureInitialized();
    const delay = this.getDelay();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Record that an email was sent
   */
  async recordSend() {
    await this.ensureInitialized();
    this.sentToday++;
    this.lastSendTime = Date.now();
    await this.saveToStorage();
  }

  /**
   * Get remaining sends for today
   * @returns {number}
   */
  getRemaining() {
    return Math.max(0, GMAIL_LIMITS.MAX_PER_DAY - this.sentToday);
  }
}
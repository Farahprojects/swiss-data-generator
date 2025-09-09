/**
 * Centralized storage key namespace system
 * Prevents guest/auth key collisions and provides consistent naming
 */

export const STORAGE_KEYS = {
  // Chat session keys (namespace by type)
  CHAT: {
    GUEST: {
      CHAT_ID: 'therai_guest_chat_id',
      SESSION_TOKEN: 'therai_guest_session_token',
      REPORT_ID: 'therai_guest_report_id',
      PAYMENT_STATUS: 'therai_guest_payment_status',
    },
    AUTH: {
      CHAT_ID: 'therai_auth_chat_id',
      SESSION_TOKEN: 'therai_auth_session_token',
      CONVERSATION_ID: 'therai_auth_conversation_id',
    },
    SHARED: {
      UUID: 'therai_chat_uuid',
      TTS_VOICE: 'therai_tts_voice',
    }
  },
  
  // UI state keys
  UI: {
    CONVERSATION_OPEN: 'therai_ui_conversation_open',
    MODAL_STATE: 'therai_ui_modal_state',
    SIDEBAR_OPEN: 'therai_ui_sidebar_open',
    SETTINGS_PANEL: 'therai_ui_settings_panel',
  },
  
  // Report generation keys
  REPORT: {
    READY_STATUS: 'therai_report_ready',
    GENERATION_STATUS: 'therai_report_generation_status',
    ERROR_STATE: 'therai_report_error_state',
  },
  
  // Navigation keys
  NAV: {
    LAST_ROUTE: 'therai_nav_last_route',
    LAST_PARAMS: 'therai_nav_last_params',
  },
  
  // Form data keys
  FORMS: {
    ASTRO_DATA: 'therai_form_astro_data',
    REPORT_FORM: 'therai_form_report_data',
    GUEST_FORM: 'therai_form_guest_data',
  },
  
  // Legacy keys (to be cleaned up)
  LEGACY: {
    GUEST_ID: 'guestId',
    GUEST_REPORT_ID: 'guest_report_id',
    CURRENT_GUEST_REPORT_ID: 'currentGuestReportId',
    CHAT_TOKEN: 'chat_token',
    CACHED_UUID: 'cached_uuid',
  }
} as const;

/**
 * Get storage key based on user type
 */
export const getChatStorageKey = (key: keyof typeof STORAGE_KEYS.CHAT.GUEST | keyof typeof STORAGE_KEYS.CHAT.AUTH, userType: 'guest' | 'auth') => {
  if (userType === 'guest') {
    return STORAGE_KEYS.CHAT.GUEST[key as keyof typeof STORAGE_KEYS.CHAT.GUEST];
  } else {
    return STORAGE_KEYS.CHAT.AUTH[key as keyof typeof STORAGE_KEYS.CHAT.AUTH];
  }
};

/**
 * Clear all storage keys for a specific user type
 */
export const clearUserStorage = (userType: 'guest' | 'auth') => {
  const keys = userType === 'guest' 
    ? Object.values(STORAGE_KEYS.CHAT.GUEST)
    : Object.values(STORAGE_KEYS.CHAT.AUTH);
    
  keys.forEach(key => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[StorageKeys] Could not clear ${key}:`, error);
    }
  });
};

/**
 * Clear all legacy keys
 */
export const clearLegacyStorage = () => {
  Object.values(STORAGE_KEYS.LEGACY).forEach(key => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[StorageKeys] Could not clear legacy ${key}:`, error);
    }
  });
};

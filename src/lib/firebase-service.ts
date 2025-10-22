// Firebase service layer - replaces Supabase client calls
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface Profile {
  id: string;
  email: string;
  email_verified: boolean;
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id?: string;
  features: Record<string, any>;
  metadata: Record<string, any>;
  last_seen_at: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  subscription_active: boolean;
  subscription_start_date?: Timestamp;
  subscription_next_charge?: Timestamp;
  stripe_subscription_id?: string;
  last_payment_status?: string;
  last_invoice_id?: string;
  verification_token?: string;
  has_profile_setup: boolean;
  display_name?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  meta: Record<string, any>;
  is_public: boolean;
  share_token?: string;
  share_mode: string;
  owner_user_id?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  created_at: Timestamp;
  meta: Record<string, any>;
  client_msg_id?: string;
  reply_to_id?: string;
  status: 'pending' | 'streaming' | 'complete' | 'failed';
  model?: string;
  token_count?: number;
  latency_ms?: number;
  error: Record<string, any>;
  updated_at: Timestamp;
  context_injected: boolean;
  message_number: number;
  mode: 'chat' | 'astro';
  user_id?: string;
  user_name?: string;
}

// Profile operations
export const profileService = {
  async get(userId: string): Promise<Profile | null> {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Profile : null;
  },

  async update(userId: string, data: Partial<Profile>): Promise<void> {
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  },

  async create(userId: string, data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const docRef = doc(db, 'profiles', userId);
    await updateDoc(docRef, {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }
};

// Conversation operations
export const conversationService = {
  async get(userId: string): Promise<Conversation[]> {
    const q = query(
      collection(db, 'conversations'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  },

  async create(data: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'conversations'), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async update(conversationId: string, data: Partial<Conversation>): Promise<void> {
    const docRef = doc(db, 'conversations', conversationId);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  },

  async delete(conversationId: string): Promise<void> {
    const docRef = doc(db, 'conversations', conversationId);
    await deleteDoc(docRef);
  }
};

// Message operations
export const messageService = {
  async get(chatId: string, limitCount: number = 50): Promise<Message[]> {
    const q = query(
      collection(db, 'conversations', chatId, 'messages'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  },

  async create(chatId: string, data: Omit<Message, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'conversations', chatId, 'messages'), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  },

  async update(messageId: string, chatId: string, data: Partial<Message>): Promise<void> {
    const docRef = doc(db, 'conversations', chatId, 'messages', messageId);
    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
  },

  // Real-time listener for messages
  onMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    const q = query(
      collection(db, 'conversations', chatId, 'messages'),
      orderBy('created_at', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Message));
      callback(messages);
    });
  }
};

// API Usage tracking
export const apiUsageService = {
  async create(data: {
    user_id: string;
    endpoint: string;
    unit_price_usd: number;
    total_cost_usd: number;
    request_params?: Record<string, any>;
  }): Promise<string> {
    const docRef = await addDoc(collection(db, 'api_usage'), {
      ...data,
      created_at: serverTimestamp()
    });
    return docRef.id;
  },

  async getUserUsage(userId: string, limitCount: number = 100): Promise<any[]> {
    const q = query(
      collection(db, 'api_usage'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

// Test script to add sample data to Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAH-KHCfhlzoGUe2T05l2JvaMsMTfcempg",
  authDomain: "therai-775c1.firebaseapp.com",
  projectId: "therai-775c1",
  storageBucket: "therai-775c1.firebasestorage.app",
  messagingSenderId: "418946818517",
  appId: "1:418946818517:web:28240ec84063be3403dd5c",
  measurementId: "G-SN872VT8Q8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestData() {
  console.log('Adding test data to Firestore...');
  
  try {
    // Add a test profile
    const profileRef = await addDoc(collection(db, 'profiles'), {
      email: 'test@example.com',
      display_name: 'Test User',
      created_at: new Date(),
      subscription_plan: 'free'
    });
    console.log('✅ Added test profile:', profileRef.id);
    
    // Add a test conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      user_id: 'test-user-123',
      title: 'Test Conversation',
      created_at: new Date()
    });
    console.log('✅ Added test conversation:', conversationRef.id);
    
    // Add a test message
    const messageRef = await addDoc(collection(db, 'conversations', conversationRef.id, 'messages'), {
      role: 'user',
      text: 'Hello, this is a test message!',
      created_at: new Date()
    });
    console.log('✅ Added test message:', messageRef.id);
    
    console.log('🎉 Test data added successfully!');
    console.log('Now check Firebase Console to see your collections!');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
}

addTestData();

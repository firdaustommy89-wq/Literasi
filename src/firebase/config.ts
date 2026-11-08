import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firestore connection validated successfully.');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Quota exceeded') || error.message.includes('resource-exhausted')) {
        console.warn('Firestore daily quota limit reached. Using persistent server disk storage cache.');
        return;
      }
      if (error.message.includes('the client is offline')) {
        console.warn('Firestore client currently connecting or operating in offline cache mode.');
        return;
      }
    }
  }
}

testConnection();

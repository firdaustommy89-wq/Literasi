import { INITIAL_USERS, INITIAL_LITERACY_ENTRIES } from '../data/initialData';
import { db } from '../firebase/config';
import { cleanUndefined } from '../firebase/service';
import { doc, setDoc } from 'firebase/firestore';

async function seed() {
  console.log('Seeding users with gentle pace:');
  for (const u of INITIAL_USERS) {
    try {
      await setDoc(doc(db, 'users', u.id), cleanUndefined(u));
      console.log('User OK:', u.id);
    } catch (e: any) {
      console.error('User FAIL:', u.id, e.message);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('Seeding entries with gentle pace:');
  for (const e of INITIAL_LITERACY_ENTRIES) {
    try {
      await setDoc(doc(db, 'literacy_entries', e.id), cleanUndefined(e));
      console.log('Entry OK:', e.id);
    } catch (err: any) {
      console.error('Entry FAIL:', e.id, err.message);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('ALL SEEDING COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

seed();

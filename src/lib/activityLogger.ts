import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { StaffActivity, ActivityAction } from '../types';
import { parseFirestoreDate } from './dateUtils';

const LOCAL_ACTIVITIES_KEY = 'sussex_pharmacy_staff_activities';

export async function logStaffActivity({
  staffId,
  staffName,
  action,
  title,
  description,
  details
}: {
  staffId: string;
  staffName: string;
  action: ActivityAction;
  title: string;
  description: string;
  details?: Record<string, any>;
}): Promise<void> {
  const newActivity: StaffActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    staffId,
    staffName,
    action,
    title,
    description,
    details: details || {},
    timestamp: new Date().toISOString(),
  };

  // 1. Cache to local storage immediately
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    const existing: StaffActivity[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newActivity);
    // Keep last 100 in local cache
    localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.warn('Could not cache activity locally:', e);
  }

  // 2. Persist to Firestore if online
  try {
    await addDoc(collection(db, 'activities'), {
      staffId,
      staffName,
      action,
      title,
      description,
      details: details || {},
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.warn('Could not write activity to Firestore (stored locally):', e);
  }
}

export async function getStaffActivities(staffId: string, limitCount = 10): Promise<StaffActivity[]> {
  const localList: StaffActivity[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    if (raw) {
      const all: StaffActivity[] = JSON.parse(raw);
      localList.push(...all.filter(a => a.staffId === staffId));
    }
  } catch (e) {
    console.warn('Error reading local activities:', e);
  }

  try {
    // Try query on Firestore
    const q = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const firestoreList: StaffActivity[] = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          staffId: data.staffId,
          staffName: data.staffName || 'Staff Member',
          action: data.action || 'login',
          title: data.title || '',
          description: data.description || '',
          details: data.details || {},
          timestamp: parseFirestoreDate(data.timestamp)
        } as StaffActivity;
      })
      .filter(a => a.staffId === staffId);

    // Merge and deduplicate by timestamp / description
    const combined = [...firestoreList, ...localList];
    const seen = new Set<string>();
    const unique: StaffActivity[] = [];

    for (const item of combined) {
      const key = `${item.staffId}-${item.action}-${item.description}-${new Date(item.timestamp).getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return unique.slice(0, limitCount);
  } catch (e) {
    console.warn('Firestore activities query error, using local fallback:', e);
    localList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return localList.slice(0, limitCount);
  }
}

export async function getAllActivities(limitCount = 20): Promise<StaffActivity[]> {
  try {
    const q = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          staffId: data.staffId,
          staffName: data.staffName || 'Staff Member',
          action: data.action || 'login',
          title: data.title || '',
          description: data.description || '',
          details: data.details || {},
          timestamp: parseFirestoreDate(data.timestamp)
        } as StaffActivity;
      });
    }
  } catch (e) {
    console.warn('Could not fetch all activities from Firestore:', e);
  }

  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    if (raw) {
      const all: StaffActivity[] = JSON.parse(raw);
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return all.slice(0, limitCount);
    }
  } catch (e) {
    console.warn('Error reading local activities:', e);
  }

  return [];
}

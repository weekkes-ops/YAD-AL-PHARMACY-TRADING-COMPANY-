import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout } from '../lib/firebase';
import { Staff, StaffRole } from '../types';
import { logStaffActivity } from '../lib/activityLogger';

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  loading: boolean;
  login: () => Promise<void>;
  loginAsStaff: (email: string, name: string, role: StaffRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'sussex_pharmacy_staff_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore local staff session if present (for offline / domain-restricted fallback)
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.staff && parsed?.user) {
          setUser(parsed.user as User);
          setStaff(parsed.staff as Staff);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Could not restore local session:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const staffRef = doc(db, 'staff', firebaseUser.uid);
          const staffDoc = await getDoc(staffRef);
          
          if (staffDoc.exists()) {
            const data = staffDoc.data() as Staff;
            setStaff(data);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: firebaseUser, staff: data }));
          } else {
            const isAdminEmail = firebaseUser.email?.toLowerCase() === 'dgookt@gmail.com';
            const newStaff: Staff = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staff Member',
              email: firebaseUser.email || '',
              role: isAdminEmail ? StaffRole.ADMIN : StaffRole.PHARMACIST,
              isVerified: true
            };
            await setDoc(staffRef, newStaff);
            setStaff(newStaff);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: firebaseUser, staff: newStaff }));
            logStaffActivity({
              staffId: newStaff.id,
              staffName: newStaff.name,
              action: 'login',
              title: 'Portal Sign In',
              description: `Signed in via Google account (${newStaff.email})`
            });
          }
        } catch (error) {
          console.error("Staff profile load error:", error);
          const fallbackStaff: Staff = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staff Member',
            email: firebaseUser.email || '',
            role: firebaseUser.email?.toLowerCase() === 'dgookt@gmail.com' ? StaffRole.ADMIN : StaffRole.PHARMACIST,
            isVerified: true
          };
          setStaff(fallbackStaff);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: firebaseUser, staff: fallbackStaff }));
        }
      } else {
        // If there is no local fallback active, clear state
        const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
        if (!savedSession) {
          setUser(null);
          setStaff(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const firebaseUser = await signInWithGoogle();
    if (firebaseUser) {
      setUser(firebaseUser);
    }
  };

  const loginAsStaff = async (email: string, name: string, role: StaffRole) => {
    const mockUid = `staff-${email.replace(/[^a-zA-Z0-9]/g, '_') || 'user'}`;
    const syntheticUser = {
      uid: mockUid,
      email: email,
      displayName: name,
      emailVerified: true,
    } as unknown as User;

    const staffProfile: Staff = {
      id: mockUid,
      name: name || 'Staff Member',
      email: email || '',
      role: role,
      isVerified: true
    };

    try {
      // Try to register in Firestore if online
      await setDoc(doc(db, 'staff', mockUid), staffProfile, { merge: true });
    } catch (err) {
      console.warn("Could not sync staff doc to Firestore (running local session):", err);
    }

    setUser(syntheticUser);
    setStaff(staffProfile);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: syntheticUser, staff: staffProfile }));

    logStaffActivity({
      staffId: mockUid,
      staffName: staffProfile.name,
      action: 'login',
      title: 'Direct Staff Access',
      description: `Logged in with ${staffProfile.role.toUpperCase()} privileges (${email})`
    });
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setStaff(null);
    try {
      await logout();
    } catch (e) {
      console.warn("Firebase signout warning:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, staff, loading, login, loginAsStaff, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

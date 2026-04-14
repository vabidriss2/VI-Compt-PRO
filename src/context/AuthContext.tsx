import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  company: any | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  company: null,
  loading: true,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const fullUserData = { ...data, uid: user.uid };
          setUserData(fullUserData);
          
          // Fetch company data
          if (data.companyId) {
            const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
            if (companyDoc.exists()) {
              setCompany(companyDoc.data());
            }
          }
        }
      } else {
        setUserData(null);
        setCompany(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, company, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

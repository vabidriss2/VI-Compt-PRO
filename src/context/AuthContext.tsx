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
    let unsubscribeUser: () => void = () => {};
    let unsubscribeCompany: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user data with real-time updates
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            const fullUserData = { ...data, uid: user.uid };
            setUserData(fullUserData);
            
            // Fetch company data
            if (data.companyId) {
              unsubscribeCompany = onSnapshot(doc(db, 'companies', data.companyId), (companyDoc) => {
                if (companyDoc.exists()) {
                  setCompany(companyDoc.data());
                }
              });
            }
          }
          setLoading(false);
          setIsAuthReady(true);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setLoading(false);
          setIsAuthReady(true);
        });
      } else {
        setUserData(null);
        setCompany(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
      unsubscribeCompany();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, company, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

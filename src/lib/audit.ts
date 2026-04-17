import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function logAction(
  companyId: string, 
  userId: string, 
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXECUTE' | 'INVITE' | 'REVOKE' | 'IMPORT' | 'UPDATE_PERMISSIONS', 
  collectionName: string,
  documentId: string | null,
  details: any
) {
  try {
    if (!companyId) return;
    
    await addDoc(collection(db, `companies/${companyId}/audit_logs`), {
      userId: userId || 'unknown',
      action,
      collection: collectionName,
      documentId,
      details: details || {},
      timestamp: new Date().toISOString(),
      companyId
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function logAction(
  companyId: string, 
  userId: string, 
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXECUTE', 
  collectionName: string,
  documentId: string | null,
  details: any
) {
  try {
    await addDoc(collection(db, `companies/${companyId}/audit_logs`), {
      userId,
      action,
      collection: collectionName,
      documentId,
      details,
      timestamp: new Date().toISOString(),
      companyId
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}

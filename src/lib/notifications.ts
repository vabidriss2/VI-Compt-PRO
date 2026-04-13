import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { sendEmailSimulation } from '../services/emailService';

export type NotificationType = 'invoice_due' | 'invoice_overdue' | 'payment_reminder' | 'system';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: any;
  invoiceId?: string;
  companyId: string;
}

export async function checkAndGenerateNotifications(companyId: string) {
  try {
    const today = startOfDay(new Date());
    
    // 1. Fetch all pending invoices
    const invoicesRef = collection(db, `companies/${companyId}/invoices`);
    const q = query(invoicesRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    
    const notificationsRef = collection(db, `companies/${companyId}/notifications`);
    
    for (const invoiceDoc of snapshot.docs) {
      const invoice = invoiceDoc.data();
      const dueDate = startOfDay(parseISO(invoice.dueDate));
      const daysDiff = differenceInDays(dueDate, today);
      
      let notificationType: NotificationType | null = null;
      let title = '';
      let message = '';

      if (daysDiff === 0) {
        notificationType = 'invoice_due';
        title = 'Facture à échéance aujourd\'hui';
        message = `La facture ${invoice.number} d'un montant de ${invoice.totalAmount.toLocaleString()} arrive à échéance aujourd'hui.`;
      } else if (daysDiff < 0) {
        notificationType = 'invoice_overdue';
        title = 'Facture en retard';
        message = `La facture ${invoice.number} est en retard de ${Math.abs(daysDiff)} jours.`;
      } else if (daysDiff === 3) {
        notificationType = 'payment_reminder';
        title = 'Échéance proche (J-3)';
        message = `La facture ${invoice.number} arrive à échéance dans 3 jours.`;
      }

      if (notificationType) {
        // Check if notification already exists for this invoice and type today to avoid duplicates
        const existingQ = query(
          notificationsRef, 
          where('invoiceId', '==', invoiceDoc.id),
          where('type', '==', notificationType)
        );
        const existingSnap = await getDocs(existingQ);
        
        // Only create if no notification exists for this invoice/type or if the last one was more than 24h ago
        const shouldCreate = existingSnap.empty || (
          existingSnap.docs.some(d => {
            const data = d.data();
            const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            return differenceInDays(today, created) >= 1;
          })
        );

        if (shouldCreate) {
          await addDoc(notificationsRef, {
            type: notificationType,
            title,
            message,
            status: 'unread',
            createdAt: serverTimestamp(),
            invoiceId: invoiceDoc.id,
            companyId
          });
          
          // Send Email Notification
          await sendEmailSimulation(
            companyId, 
            'admin@company.com', // In a real app, fetch the user's email or contact's email
            title,
            message,
            'invoice_reminder'
          );
        }
      }
    }
  } catch (error) {
    console.error("Error generating notifications:", error);
  }
}

export function subscribeToNotifications(companyId: string, callback: (notifications: Notification[]) => void) {
  const q = query(
    collection(db, `companies/${companyId}/notifications`),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    callback(notifications);
  });
}

export async function markAsRead(companyId: string, notificationId: string) {
  const ref = doc(db, `companies/${companyId}/notifications`, notificationId);
  await updateDoc(ref, { status: 'read' });
}

export async function markAllAsRead(companyId: string, notificationIds: string[]) {
  const batch = writeBatch(db);
  notificationIds.forEach(id => {
    const ref = doc(db, `companies/${companyId}/notifications`, id);
    batch.update(ref, { status: 'read' });
  });
  await batch.commit();
}

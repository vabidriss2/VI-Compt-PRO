import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { sendEmailSimulation } from '../services/emailService';
import { handleFirestoreError, OperationType } from './error-handler';

export type NotificationType = 'invoice_due' | 'invoice_overdue' | 'payment_reminder' | 'low_stock' | 'system';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: any;
  invoiceId?: string;
  productId?: string;
  companyId: string;
}

export async function checkAndGenerateNotifications(companyId: string) {
  try {
    const today = startOfDay(new Date());
    const notificationsRef = collection(db, `companies/${companyId}/notifications`);
    
    // 1. Check Invoices
    const invoicesRef = collection(db, `companies/${companyId}/invoices`);
    const qInvoices = query(invoicesRef, where('status', '==', 'pending'));
    const invoiceSnapshot = await getDocs(qInvoices);
    
    for (const invoiceDoc of invoiceSnapshot.docs) {
      const invoice = invoiceDoc.data();
      const dueDate = startOfDay(parseISO(invoice.dueDate));
      const daysDiff = differenceInDays(dueDate, today);
      
      let notificationType: NotificationType | null = null;
      let title = '';
      let statusLabel = '';
      const typeLabel = invoice.type === 'sale' ? 'Vente' : 'Achat';
      const amountStr = `${invoice.totalAmount.toLocaleString()}`;

      if (daysDiff === 0) {
        notificationType = 'invoice_due';
        title = `Facture ${typeLabel} à échéance`;
        statusLabel = "aujourd'hui";
      } else if (daysDiff < 0) {
        notificationType = 'invoice_overdue';
        title = `Facture ${typeLabel} en retard`;
        statusLabel = `en retard de ${Math.abs(daysDiff)} jours`;
      } else if (daysDiff === 3) {
        notificationType = 'payment_reminder';
        title = `Facture ${typeLabel} - Échéance proche`;
        statusLabel = 'à échéance dans 3 jours';
      }

      if (notificationType) {
        const message = `Facture ${typeLabel} n°${invoice.number} d'un montant de ${amountStr} est ${statusLabel}.`;
        
        const existingQ = query(
          notificationsRef, 
          where('invoiceId', '==', invoiceDoc.id),
          where('type', '==', notificationType)
        );
        const existingSnap = await getDocs(existingQ);
        
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
        }
      }
    }

    // 2. Check Low Stock
    const productsRef = collection(db, `companies/${companyId}/products`);
    const productSnapshot = await getDocs(productsRef);
    
    for (const productDoc of productSnapshot.docs) {
      const product = productDoc.data();
      if (product.stockQuantity <= product.minStock) {
        const notificationType = 'low_stock';
        const title = `Alerte Stock : ${product.name}`;
        const message = `Le stock de ${product.name} (${product.stockQuantity} ${product.unit}) est inférieur ou égal au seuil d'alerte (${product.minStock}).`;

        const existingQ = query(
          notificationsRef, 
          where('productId', '==', productDoc.id),
          where('type', '==', notificationType)
        );
        const existingSnap = await getDocs(existingQ);
        
        const shouldCreate = existingSnap.empty || (
          existingSnap.docs.some(d => {
            const data = d.data();
            const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            return differenceInDays(today, created) >= 3; // Only notify every 3 days for stock
          })
        );

        if (shouldCreate) {
          await addDoc(notificationsRef, {
            type: notificationType,
            title,
            message,
            status: 'unread',
            createdAt: serverTimestamp(),
            productId: productDoc.id,
            companyId
          });
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
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `companies/${companyId}/notifications`);
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

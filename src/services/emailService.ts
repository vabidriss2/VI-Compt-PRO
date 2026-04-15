import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface EmailLog {
  to: string;
  subject: string;
  body: string;
  type: 'invoice_reminder' | 'payment_confirmation' | 'system' | 'invoice_send';
  status: 'sent' | 'failed';
  createdAt: any;
  companyId: string;
}

export async function sendEmailSimulation(companyId: string, to: string, subject: string, body: string, type: EmailLog['type']) {
  try {
    // In a real app, you would call an API like SendGrid, Postmark, or AWS SES here.
    // For this applet, we simulate the sending and log it to Firestore for visibility.
    
    console.log(`[EMAIL SIMULATION] 
      To: ${to}
      Subject: ${subject}
      Type: ${type}
      Body: ${body}
    `);

    await addDoc(collection(db, `companies/${companyId}/email_logs`), {
      to,
      subject,
      body,
      type,
      status: 'sent',
      createdAt: serverTimestamp(),
      companyId
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send email simulation:", error);
    return { success: false, error };
  }
}

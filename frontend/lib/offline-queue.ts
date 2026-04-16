// lib/offline-queue.ts

export interface Transaction {
  id: string;
  type: 'fare' | 'qr_payment';
  amount: number;
  passengerType: string;
  distance: number;
  timestamp: number;
  synced: boolean;
}

const QUEUE_KEY = 'conductor_offline_queue';

export const logTransactionOffline = (transaction: Omit<Transaction, 'id' | 'timestamp' | 'synced'>) => {
  const queue: Transaction[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  
  const newTransaction: Transaction = {
    ...transaction,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    synced: false,
  };

  queue.push(newTransaction);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  
  // Trigger background sync if online
  if (navigator.onLine) {
    syncTransactions();
  }
};

// Call this when the app regains connection
export const syncTransactions = async () => {
  const queue: Transaction[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const unsynced = queue.filter(t => !t.synced);

  if (unsynced.length === 0) return;

  try {
    // TODO: Replace this with your actual API call (e.g., fetch('/api/remittance'))
    console.log("Syncing transactions to server:", unsynced);
    
    // Simulate API success
    const updatedQueue = queue.map(t => ({ ...t, synced: true }));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
  } catch (error) {
    console.error("Failed to sync, will retry later:", error);
  }
};

// Listen for network reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncTransactions);
}
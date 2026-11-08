import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'academic' | 'attendance' | 'message' | 'finance' | 'system';
  priority: 'normal' | 'urgent';
  timestamp: Date;
  read: boolean;
  link?: string;
  actionLabel?: string;
  senderName?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { organization, currentSchool } = useTenant();

  const [rawAnnouncements, setRawAnnouncements] = useState<AppNotification[]>([]);
  const [rawNotifications, setRawNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`edumo_read_notifications_${currentUser?.uid || 'guest'}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`edumo_deleted_notifications_${currentUser?.uid || 'guest'}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Reload read & deleted sets when currentUser changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRead = localStorage.getItem(`edumo_read_notifications_${currentUser?.uid || 'guest'}`);
      setReadIds(storedRead ? new Set(JSON.parse(storedRead)) : new Set());

      const storedDel = localStorage.getItem(`edumo_deleted_notifications_${currentUser?.uid || 'guest'}`);
      setDeletedIds(storedDel ? new Set(JSON.parse(storedDel)) : new Set());
    } catch {}
  }, [currentUser?.uid]);

  // Save readIds to localStorage
  const saveReadIds = useCallback((newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(
        `edumo_read_notifications_${currentUser?.uid || 'guest'}`,
        JSON.stringify(Array.from(newSet))
      );
    } catch {}
  }, [currentUser?.uid]);

  // Save deletedIds to localStorage
  const saveDeletedIds = useCallback((newSet: Set<string>) => {
    setDeletedIds(newSet);
    try {
      localStorage.setItem(
        `edumo_deleted_notifications_${currentUser?.uid || 'guest'}`,
        JSON.stringify(Array.from(newSet))
      );
    } catch {}
  }, [currentUser?.uid]);

  // Real-time Firestore announcements listener
  useEffect(() => {
    if (!organization?.id || !currentSchool?.id) {
      setRawAnnouncements([]);
      setRawNotifications([]);
      return;
    }

    try {
      const annRef = collection(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'announcements'
      );
      const qAnn = query(annRef, orderBy('createdAt', 'desc'), limit(25));

      const unsubAnn = onSnapshot(
        qAnn,
        (snap) => {
          const list: AppNotification[] = snap.docs.map((d) => {
            const data = d.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            return {
              id: `ann-${d.id}`,
              title: data.title || 'School Announcement',
              message: data.body || '',
              type: 'announcement',
              priority: data.priority === 'urgent' ? 'urgent' : 'normal',
              timestamp: ts,
              read: false,
              link: '/announcements',
              actionLabel: 'View Announcement',
              senderName: data.senderName || 'School Administration',
            };
          });
          setRawAnnouncements(list);
        },
        () => {
          setRawAnnouncements([]);
        }
      );

      // Real-time notifications collection (academic, attendance, finance, system alerts)
      const notifRef = collection(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'notifications'
      );
      const qNotif = query(notifRef, orderBy('createdAt', 'desc'), limit(25));

      const unsubNotif = onSnapshot(
        qNotif,
        (snap) => {
          const list: AppNotification[] = snap.docs.map((d) => {
            const data = d.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            return {
              id: `notif-${d.id}`,
              title: data.title || 'Notification',
              message: data.message || data.body || '',
              type: data.type || 'system',
              priority: data.priority === 'urgent' ? 'urgent' : 'normal',
              timestamp: ts,
              read: Boolean(data.read),
              link: data.link || '/dashboard',
              actionLabel: data.actionLabel || 'View Details',
              senderName: data.senderName || 'School Notice',
            };
          });
          setRawNotifications(list);
        },
        () => {
          setRawNotifications([]);
        }
      );

      return () => {
        unsubAnn();
        unsubNotif();
      };
    } catch {
      setRawAnnouncements([]);
      setRawNotifications([]);
    }
  }, [organization?.id, currentSchool?.id]);

  // Merged and deduplicated 100% real live notifications
  const notifications = useMemo(() => {
    const combined = [...rawAnnouncements, ...rawNotifications];
    return combined
      .filter((n) => !deletedIds.has(n.id))
      .map((n) => ({
        ...n,
        read: readIds.has(n.id) || n.read,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [rawAnnouncements, rawNotifications, readIds, deletedIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    saveReadIds(new Set([...readIds, id]));
  }, [readIds, saveReadIds]);

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    saveReadIds(allIds);
  }, [notifications, saveReadIds]);

  const deleteNotification = useCallback((id: string) => {
    saveDeletedIds(new Set([...deletedIds, id]));
  }, [deletedIds, saveDeletedIds]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};


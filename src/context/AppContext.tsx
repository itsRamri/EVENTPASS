import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, 
  EventItem, 
  GuestRegistration, 
  StaffMember, 
  NotificationItem, 
  ScanHistoryRecord,
  UserRole,
  GuestStatus,
  CheckinAuditRecord 
} from '../types';
import { sound } from '../utils/audio';
import {
  syncEventToDb,
  deleteEventFromDb,
  syncGuestToDb,
  updateGuestStatusInDb,
  deleteGuestFromDb,
  syncStaffToDb,
  deleteStaffFromDb,
  subscribeToStaff,
  syncScanLogToDb,
  deleteScanLogFromDb,
  subscribeToScanLogs,
  syncCheckinAuditRecord,
  subscribeToCheckins,
  syncNotificationToDb,
  deleteNotificationFromDb,
  subscribeToNotifications,
  syncUserProfileToDb,
  subscribeToEvents,
  subscribeToGuests,
  seedAllDataToFirestore
} from '../services/dbService';
import { firebaseSignOut } from '../services/authService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
}

export const getFormattedTimestamp = (): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} • ${timeStr}`;
};

interface AppContextType {
  user: UserProfile;
  events: EventItem[];
  guests: GuestRegistration[];
  staff: StaffMember[];
  notifications: NotificationItem[];
  scanLogs: ScanHistoryRecord[];
  checkins: CheckinAuditRecord[];
  currentView: string;
  profileSubpage: 'my_events' | 'my_tickets' | 'history' | 'settings' | 'support' | null;
  selectedEventId: string | null;
  activePassGuestId: string | null;
  editingEvent: EventItem | null;
  isRoleModalOpen: boolean;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  isAuthenticated: boolean;
  
  // Actions
  login: (userProfile: UserProfile) => void;
  logout: () => void;
  navigate: (view: string) => void;
  setProfileSubpage: (subpage: 'my_events' | 'my_tickets' | 'history' | 'settings' | 'support' | null) => void;
  switchRole: (role: UserRole) => void;
  updateUser: (data: Partial<UserProfile>) => void;
  saveEvent: (event: EventItem) => void;
  deleteEvent: (id: string) => void;
  setEditingEvent: (event: EventItem | null) => void;
  saveGuest: (guest: GuestRegistration) => void;
  addDirectGuest: (guest: GuestRegistration) => void;
  updateGuestStatus: (guestId: string, status: GuestStatus, scannerName?: string) => void;
  checkInSingleToken: (guestId: string, tokenCode: string, scannerName?: string) => { success: boolean; isComplete: boolean; remaining: number; tokenIndex: number; totalTokens: number };
  deleteGuest: (id: string) => void;

  saveStaff: (member: StaffMember) => void;
  deleteStaff: (id: string) => void;
  updateStaffPermission: (staffId: string, permKey: string, value: boolean) => void;
  toggleStaffStatus: (staffId: string) => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markNotificationsRead: () => void;
  addScanLog: (record: Omit<ScanHistoryRecord, 'id' | 'timestamp'>) => void;
  deleteScanLog: (id: string) => void;
  clearScanLogs: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error', title?: string) => void;
  openDigitalPass: (guestId: string) => void;
  closeDigitalPass: () => void;
  setRoleModalOpen: (open: boolean) => void;
  setSelectedEventId: (id: string | null) => void;
  resetAllData: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: '',
  name: '',
  email: '',
  mobile: '',
  role: 'manager',
  status: 'active',
  avatar: '',
  college: '',
  branch: ''
};

const DEFAULT_EVENTS: EventItem[] = [];
const DEFAULT_GUESTS: GuestRegistration[] = [];
const DEFAULT_STAFF: StaffMember[] = [];
const DEFAULT_NOTIFS: NotificationItem[] = [];
const DEFAULT_SCAN_LOGS: ScanHistoryRecord[] = [];
const DEFAULT_CHECKINS: CheckinAuditRecord[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ep_react_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email && !parsed.email.includes('aarav.sharma')) {
          return {
            ...parsed,
            avatar: (parsed.avatar && !parsed.avatar.includes('unsplash.com')) ? parsed.avatar : ''
          };
        }
      } catch (err) {}
    }
    return DEFAULT_USER;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('ep_react_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e: EventItem) => !['evt_fresher_2026', 'evt_hackathon_2026'].includes(e.id));
        }
      } catch (err) {}
    }
    return DEFAULT_EVENTS;
  });

  const [guests, setGuests] = useState<GuestRegistration[]>(() => {
    const saved = localStorage.getItem('ep_react_guests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((g: GuestRegistration) => !['gst_101', 'gst_103'].includes(g.id))
            .map((g: GuestRegistration) => ({
              ...g,
              avatar: (g.avatar && !g.avatar.includes('unsplash.com')) ? g.avatar : ''
            }));
        }
      } catch (err) {}
    }
    return DEFAULT_GUESTS;
  });

  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('ep_react_staff');
    return saved ? JSON.parse(saved) : DEFAULT_STAFF;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('ep_react_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFS;
  });

  const [scanLogs, setScanLogs] = useState<ScanHistoryRecord[]>(() => {
    const saved = localStorage.getItem('ep_react_scan_logs');
    return saved ? JSON.parse(saved) : DEFAULT_SCAN_LOGS;
  });

  const [checkins, setCheckins] = useState<CheckinAuditRecord[]>(() => {
    const saved = localStorage.getItem('ep_react_checkins');
    return saved ? JSON.parse(saved) : DEFAULT_CHECKINS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('ep_react_is_authenticated');
    const savedUser = localStorage.getItem('ep_react_user');
    if (savedAuth && savedUser) {
      try {
        const isAuth = JSON.parse(savedAuth);
        const parsedUser = JSON.parse(savedUser);
        if (isAuth === true && parsedUser && parsedUser.id && parsedUser.email && !parsedUser.email.includes('aarav.sharma')) {
          return true;
        }
      } catch (err) {}
    }
    return false;
  });

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [profileSubpage, setProfileSubpage] = useState<'my_events' | 'my_tickets' | 'history' | 'settings' | 'support' | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activePassGuestId, setActivePassGuestId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isRoleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('ep_react_is_authenticated', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('ep_react_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ep_react_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('ep_react_guests', JSON.stringify(guests));
  }, [guests]);

  useEffect(() => {
    localStorage.setItem('ep_react_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('ep_react_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ep_react_scan_logs', JSON.stringify(scanLogs));
  }, [scanLogs]);

  useEffect(() => {
    localStorage.setItem('ep_react_checkins', JSON.stringify(checkins));
  }, [checkins]);

  // Listen for real-time Firestore updates
  useEffect(() => {
    const unsubEvents = subscribeToEvents((remoteEvents) => {
      if (remoteEvents) {
        const cleanEvents = remoteEvents.filter(e => !['evt_fresher_2026', 'evt_hackathon_2026'].includes(e.id));
        setEvents(cleanEvents);
      }
    });
    const unsubGuests = subscribeToGuests((remoteGuests) => {
      if (remoteGuests) {
        const cleanGuests = remoteGuests
          .filter(g => !['gst_101', 'gst_103'].includes(g.id))
          .map(g => ({
            ...g,
            avatar: (g.avatar && !g.avatar.includes('unsplash.com')) ? g.avatar : ''
          }));
        setGuests(cleanGuests);
      }
    });
    const unsubCheckins = subscribeToCheckins((remoteCheckins) => {
      if (remoteCheckins) {
        setCheckins(remoteCheckins);
      }
    });
    const unsubStaff = subscribeToStaff((remoteStaff) => {
      if (remoteStaff) {
        setStaff(remoteStaff);
      }
    });
    const unsubScanLogs = subscribeToScanLogs((remoteLogs) => {
      if (remoteLogs) {
        setScanLogs(remoteLogs);
      }
    });
    const unsubNotifs = subscribeToNotifications((remoteNotifs) => {
      if (remoteNotifs) {
        setNotifications(remoteNotifs);
      }
    });

    return () => {
      unsubEvents();
      unsubGuests();
      unsubCheckins();
      unsubStaff();
      unsubScanLogs();
      unsubNotifs();
    };
  }, []);

  // Adjust default view when role changes
  const switchRole = (newRole: UserRole) => {
    const updatedUser = { ...user, role: newRole };
    if (newRole === 'manager') {
      setCurrentView('dashboard');
    } else if (newRole === 'guest') {
      setCurrentView('guest_home');
    } else if (newRole === 'scanner') {
      setCurrentView('scanner');
    }
    setUser(updatedUser);
    syncUserProfileToDb(updatedUser);
    showToast(`Switched view to ${newRole.toUpperCase()}`, 'info');
  };

  const login = (newUser: UserProfile) => {
    const cleanAvatar = (newUser.avatar && !newUser.avatar.includes('unsplash.com')) ? newUser.avatar : '';
    const userToSave = { ...newUser, avatar: cleanAvatar };
    setUser(userToSave);
    setIsAuthenticated(true);
    syncUserProfileToDb(userToSave);
    if (newUser.role === 'manager') setCurrentView('dashboard');
    else if (newUser.role === 'guest') setCurrentView('guest_home');
    else setCurrentView('scanner');
    sound.play('success');
    showToast(`✓ Welcome back, ${newUser.name}!`, 'success', 'Logged In');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ep_react_is_authenticated');
    localStorage.removeItem('ep_react_user');
    setUser(DEFAULT_USER);
    firebaseSignOut();
    sound.play('click');
    showToast('You have been logged out safely.', 'info');
  };

  const updateUser = (data: Partial<UserProfile>) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      syncUserProfileToDb(updated);
      return updated;
    });
    showToast('Profile updated successfully', 'success');
  };

  const navigate = (view: string) => {
    if (view !== 'profile') {
      setProfileSubpage(null);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEvent = (event: EventItem) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [event, ...prev];
    });
    syncEventToDb(event);
    setEditingEvent(null);
    showToast(`Event "${event.name}" saved successfully!`, 'success');
  };

  const deleteEvent = (id: string) => {
    const evt = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setGuests(prev => prev.filter(g => g.eventId !== id));
    deleteEventFromDb(id);
    showToast(`Event "${evt?.name || id}" and registrations deleted`, 'warning');
  };

  const saveGuest = (guest: GuestRegistration) => {
    setGuests(prev => {
      const idx = prev.findIndex(g => g.id === guest.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = guest;
        return next;
      }
      return [guest, ...prev];
    });
    syncGuestToDb(guest);
  };

  const addDirectGuest = (guest: GuestRegistration) => {
    setGuests(prev => [guest, ...prev]);
    syncGuestToDb(guest);
    showToast(`Guest "${guest.name}" uploaded/added to event!`, 'success');
    if (user.id || user.email || user.mobile) {
      addNotification({
        title: 'Guest Added',
        message: `${guest.name} was added to the event guest list.`,
        type: 'success',
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientPhone: user.mobile,
        recipientRole: 'manager'
      });
    }
  };

  const updateGuestStatus = (guestId: string, status: GuestStatus, scannerName?: string) => {
    const formattedTime = getFormattedTimestamp();
    const activeStaff = scannerName || `${user.name} (${user.role === 'manager' ? 'Manager' : 'Staff'})`;
    let targetGuest: GuestRegistration | null = null;

    setGuests(prev => prev.map(g => {
      if (g.id === guestId) {
        const evt = events.find(e => e.id === g.eventId);
        const prefix = evt?.tokenSettings?.prefix || 'EP-PASS';
        const perUserTokens = g.tokenCount || evt?.tokenSettings?.tokensPerUser || 1;

        // Generate clean base unique token code
        const baseToken = (g.token && g.token.trim() !== '') 
          ? g.token.replace(/-\d+$/, '')
          : `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const uniquePassId = (g.passId && g.passId.trim() !== '') 
          ? g.passId 
          : `PASS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        // Generate full list of tokens for this guest
        let tokens: string[] = g.tokens || [];
        let tokenList = g.tokenList || [];

        if (tokens.length === 0 || tokenList.length === 0) {
          tokens = [];
          tokenList = [];
          for (let i = 1; i <= perUserTokens; i++) {
            const code = perUserTokens === 1 ? baseToken : `${baseToken}-${i}`;
            tokens.push(code);
            tokenList.push({
              tokenCode: code,
              index: i,
              status: 'valid',
              checkInTime: null,
              scannedBy: null
            });
          }
        }

        const updatedGuest: GuestRegistration = {
          ...g,
          status,
          token: (status === 'approved' || status === 'checkedin') ? (tokens[0] || baseToken) : (g.token || baseToken),
          tokens: tokens,
          tokenList: tokenList,
          tokenCount: perUserTokens,
          usedTokens: g.usedTokens || 0,
          passId: uniquePassId,
          checkInTime: status === 'checkedin' ? (g.checkInTime || formattedTime) : g.checkInTime,
          scanTimestamp: formattedTime,
          scannedBy: status === 'checkedin' ? activeStaff : g.scannedBy,
          scannedByEmail: status === 'checkedin' ? (user.email || null) : g.scannedByEmail
        };

        targetGuest = updatedGuest;
        syncGuestToDb(updatedGuest);

        if (status === 'approved') {
          addNotification({
            title: '🎉 Entry Pass Approved!',
            message: `Your pass request for "${evt?.name || 'Party Event'}" has been approved! Your QR pass is now active.`,
            type: 'success',
            recipientEmail: g.email,
            recipientPhone: g.mobile,
            recipientRole: 'guest'
          });
        }

        return updatedGuest;
      }
      return g;
    }));

    if (targetGuest) {
      const tg: GuestRegistration = targetGuest;
      updateGuestStatusInDb(
        guestId, 
        status, 
        status === 'checkedin' ? formattedTime : undefined, 
        status === 'checkedin' ? activeStaff : undefined,
        {
          token: tg.token,
          tokens: tg.tokens,
          tokenList: tg.tokenList,
          tokenCount: tg.tokenCount,
          passId: tg.passId,
          usedTokens: tg.usedTokens
        }
      );
    } else {
      updateGuestStatusInDb(guestId, status, status === 'checkedin' ? formattedTime : undefined, status === 'checkedin' ? activeStaff : undefined);
    }

    // Create immutable audit record upon successful check-in
    if (status === 'checkedin') {
      const g = guests.find(item => item.id === guestId);
      if (g) {
        const evt = events.find(e => e.id === g.eventId);
        const auditRecord: CheckinAuditRecord = {
          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          guestId: g.id,
          guestName: g.name,
          eventId: g.eventId,
          eventName: evt?.name || 'Mega Tech Event',
          timestamp: formattedTime,
          isoTimestamp: new Date().toISOString(),
          scannedBy: activeStaff,
          token: g.token || 'EP-PASS-VIP',
          passId: g.passId || 'PASS-VAL',
          avatar: g.avatar,
          college: g.college,
          branch: g.branch,
          rollNo: g.rollNo,
          gate: 'Main Entry Gate (Gate 1)',
          status: 'checkedin'
        };
        setCheckins(prev => [auditRecord, ...prev]);
        syncCheckinAuditRecord(auditRecord);
      }
    }

    if (status === 'approved') sound.play('success');
    if (status === 'rejected') sound.play('error');
    if (status === 'checkedin') sound.play('checkin');
    showToast(`Guest status: ${status.toUpperCase()}`, status === 'approved' || status === 'checkedin' ? 'success' : 'warning');
  };

  const checkInSingleToken = (guestId: string, tokenCode: string, scannerName?: string) => {
    const formattedTime = getFormattedTimestamp();
    const activeStaff = scannerName || `${user.name} (${user.role === 'manager' ? 'Manager' : 'Staff'})`;
    let result = { success: false, isComplete: false, remaining: 0, tokenIndex: 1, totalTokens: 1 };

    setGuests(prev => prev.map(g => {
      if (g.id === guestId) {
        const total = g.tokenCount || g.tokens?.length || 1;
        let tokenIndex = 1;
        let updatedList = (g.tokenList || []).map((t, idx) => {
          if (t.tokenCode.toUpperCase() === tokenCode.toUpperCase() || (!g.tokenList && idx === 0)) {
            tokenIndex = t.index || (idx + 1);
            return {
              ...t,
              status: 'used' as const,
              checkInTime: formattedTime,
              scannedBy: activeStaff
            };
          }
          return t;
        });

        // If tokenList was empty, populate it
        if (updatedList.length === 0) {
          updatedList = [{
            tokenCode: tokenCode,
            index: 1,
            status: 'used',
            checkInTime: formattedTime,
            scannedBy: activeStaff
          }];
        }

        const usedCount = updatedList.filter(t => t.status === 'used').length;
        const isComplete = usedCount >= total;
        const remaining = Math.max(0, total - usedCount);

        result = {
          success: true,
          isComplete,
          remaining,
          tokenIndex,
          totalTokens: total
        };

        const updatedGuest: GuestRegistration = {
          ...g,
          tokenList: updatedList,
          usedTokens: usedCount,
          status: isComplete ? 'checkedin' : 'approved',
          checkInTime: formattedTime,
          scanTimestamp: formattedTime,
          scannedBy: activeStaff,
          scannedByEmail: user.email || null
        };

        syncGuestToDb(updatedGuest);

        // Audit Record
        const evt = events.find(e => e.id === g.eventId);
        const auditRecord: CheckinAuditRecord = {
          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          guestId: g.id,
          guestName: g.name,
          eventId: g.eventId,
          eventName: evt?.name || 'Mega Tech Event',
          timestamp: formattedTime,
          isoTimestamp: new Date().toISOString(),
          scannedBy: activeStaff,
          token: tokenCode,
          passId: g.passId || 'PASS-VAL',
          avatar: g.avatar,
          college: g.college,
          branch: g.branch,
          rollNo: g.rollNo,
          gate: `Gate Admission (Token #${tokenIndex} of ${total})`,
          status: 'checkedin'
        };
        setCheckins(prevAudit => [auditRecord, ...prevAudit]);
        syncCheckinAuditRecord(auditRecord);

        return updatedGuest;
      }
      return g;
    }));

    return result;
  };


  const deleteGuest = (id: string) => {
    const g = guests.find(item => item.id === id);
    setGuests(prev => prev.filter(item => item.id !== id));
    deleteGuestFromDb(id);
    showToast(`Guest "${g?.name || id}" removed from event`, 'info');
  };

  const saveStaff = (member: StaffMember) => {
    setStaff(prev => {
      const idx = prev.findIndex(s => s.id === member.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = member;
        return next;
      }
      return [member, ...prev];
    });
    syncStaffToDb(member);
    showToast(`Staff "${member.name}" saved`, 'success');
  };

  const deleteStaff = (id: string) => {
    const s = staff.find(item => item.id === id);
    setStaff(prev => prev.filter(item => item.id !== id));
    deleteStaffFromDb(id);
    showToast(`Staff access revoked for "${s?.name || id}"`, 'warning');
  };

  const updateStaffPermission = (staffId: string, permKey: string, value: boolean) => {
    setStaff(prev => prev.map(s => {
      if (s.id === staffId) {
        const updated = {
          ...s,
          permissions: {
            ...s.permissions,
            [permKey]: value
          }
        };
        syncStaffToDb(updated);
        return updated;
      }
      return s;
    }));
    showToast('Staff permissions updated', 'success');
  };

  const toggleStaffStatus = (staffId: string) => {
    setStaff(prev => prev.map(s => {
      if (s.id === staffId) {
        const nextStatus: 'active' | 'disabled' = s.status === 'active' ? 'disabled' : 'active';
        showToast(`Staff access ${nextStatus}`, 'info');
        const updated: StaffMember = { ...s, status: nextStatus };
        syncStaffToDb(updated);
        return updated;
      }
      return s;
    }));
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: 'notif_' + Date.now(),
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    syncNotificationToDb(newNotif);
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    deleteNotificationFromDb(id);
    showToast('Notification deleted', 'info');
  };

  const clearAllNotifications = () => {
    notifications.forEach(n => deleteNotificationFromDb(n.id));
    setNotifications([]);
    showToast('All notifications cleared', 'info');
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => {
      const updated = { ...n, read: true };
      syncNotificationToDb(updated);
      return updated;
    }));
    showToast('All notifications marked as read', 'info');
  };

  const addScanLog = (record: Omit<ScanHistoryRecord, 'id' | 'timestamp'>) => {
    const newLog: ScanHistoryRecord = {
      ...record,
      id: 'scan_' + Date.now(),
      timestamp: getFormattedTimestamp()
    };
    setScanLogs(prev => [newLog, ...prev]);
    syncScanLogToDb(newLog);
  };

  const deleteScanLog = (id: string) => {
    setScanLogs(prev => prev.filter(l => l.id !== id));
    deleteScanLogFromDb(id);
    showToast('Scan log entry removed', 'info');
  };

  const clearScanLogs = () => {
    scanLogs.forEach(l => deleteScanLogFromDb(l.id));
    setScanLogs([]);
    showToast('Scan history cleared', 'info');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', title?: string) => {
    const id = 'toast_' + Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openDigitalPass = (guestId: string) => {
    setActivePassGuestId(guestId);
  };

  const closeDigitalPass = () => {
    setActivePassGuestId(null);
  };

  const resetAllData = () => {
    localStorage.removeItem('ep_react_user');
    localStorage.removeItem('ep_react_events');
    localStorage.removeItem('ep_react_guests');
    localStorage.removeItem('ep_react_staff');
    localStorage.removeItem('ep_react_notifications');
    localStorage.removeItem('ep_react_scan_logs');
    localStorage.removeItem('ep_react_checkins');
    setUser(DEFAULT_USER);
    setEvents(DEFAULT_EVENTS);
    setGuests(DEFAULT_GUESTS);
    setStaff(DEFAULT_STAFF);
    setNotifications(DEFAULT_NOTIFS);
    setScanLogs(DEFAULT_SCAN_LOGS);
    setCheckins(DEFAULT_CHECKINS);
    setEditingEvent(null);
    setCurrentView('dashboard');
    showToast('All data reset to defaults', 'info');
  };

  const visibleNotifications = React.useMemo(() => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhone = (user.mobile || '').replace(/\D/g, '');
    const userId = (user.id || '').trim();

    return notifications.filter(n => {
      // 0. Targeted specifically by userId
      if (n.recipientUserId) {
        return Boolean(userId && n.recipientUserId === userId);
      }

      // 1. Targeted specifically to an email
      if (n.recipientEmail) {
        const notifEmail = n.recipientEmail.toLowerCase().trim();
        return Boolean(userEmail && notifEmail === userEmail);
      }

      // 2. Targeted specifically to a phone number
      if (n.recipientPhone) {
        const notifPhone = n.recipientPhone.replace(/\D/g, '');
        return Boolean(userPhone && notifPhone && userPhone === notifPhone);
      }

      // 3. Targeted specifically to a role (only if not addressed to a specific person)
      if (n.recipientRole && n.recipientRole !== 'all') {
        return n.recipientRole === user.role;
      }

      // 4. Untargeted / broadcast: Only show if recipientRole is explicitly 'all'
      return n.recipientRole === 'all';
    });
  }, [notifications, user]);

  return (
    <AppContext.Provider value={{
      user,
      events,
      guests,
      staff,
      notifications: visibleNotifications,
      scanLogs,
      checkins,
      currentView,
      profileSubpage,
      selectedEventId,
      activePassGuestId,
      editingEvent,
      isRoleModalOpen,
      toasts,
      isAuthenticated,
      login,
      logout,
      navigate,
      setProfileSubpage,
      switchRole,
      updateUser,
      saveEvent,
      deleteEvent,
      setEditingEvent,
      saveGuest,
      addDirectGuest,
      updateGuestStatus,
      checkInSingleToken,
      deleteGuest,

      saveStaff,
      deleteStaff,
      updateStaffPermission,
      toggleStaffStatus,
      addNotification,
      deleteNotification,
      clearAllNotifications,
      markNotificationsRead,
      addScanLog,
      deleteScanLog,
      clearScanLogs,
      showToast,
      dismissToast,
      openDigitalPass,
      closeDigitalPass,
      setRoleModalOpen,
      setSelectedEventId,
      resetAllData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

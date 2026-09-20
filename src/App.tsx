import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { DigitalPassModal } from './components/DigitalPassModal';
import { ToastContainer } from './components/ToastContainer';

// Views
import { ManagerDashboard } from './views/ManagerDashboard';
import { CreateEventWizard } from './views/CreateEventWizard';
import { GuestManagement } from './views/GuestManagement';
import { GuestHome } from './views/GuestHome';
import { LiveScanner } from './views/LiveScanner';
import { StaffManagement } from './views/StaffManagement';
import { ProfileView } from './views/ProfileView';
import { NotificationsView } from './views/NotificationsView';
import { QrGeneratorView } from './views/QrGeneratorView';
import { AuthView } from './views/AuthView';

export const App: React.FC = () => {
  const { currentView, user, isAuthenticated } = useApp();

  // Global mobile keyboard & input focus handler
  useEffect(() => {
    const isInputElement = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (isInputElement(target)) {
        document.body.classList.add('keyboard-open');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 120);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!isInputElement(active)) {
          document.body.classList.remove('keyboard-open');
        }
      }, 150);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div id="app">
        <AuthView />
        <ToastContainer />
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      // Main Organizer Dashboard
      case 'dashboard':
        return <ManagerDashboard />;
      case 'create_event':
        return <CreateEventWizard />;
      case 'guests':
        return <GuestManagement />;
      case 'staff':
        return <StaffManagement />;
      case 'qr_generator':
        return <QrGeneratorView />;

      // Gate Scanner View (for organizers and authorized staff)
      case 'scanner':
        return <LiveScanner />;
      case 'checkins':
        return <GuestManagement />;

      // Guest / Attendee Views (My Passes, Invitations & Event Search)
      case 'guest_home':
      case 'my_events':
      case 'my_passes':
        return <GuestHome />;

      // Shared Views
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;

      default:
        return <ManagerDashboard />;
    }
  };

  const isScanner = currentView === 'scanner';

  return (
    <div id="app">
      {/* Desktop Sidebar Layout */}
      {!isScanner && <Sidebar />}

      {/* Main Wrapper */}
      <div className={`app-wrapper ${isScanner ? 'scanner-mode' : ''}`}>
        {!isScanner && <Navbar />}

        <main className={`main-content ${isScanner ? 'scanner-main' : ''}`}>
          {renderCurrentView()}
        </main>

        {/* Mobile Bottom Navigation */}
        {!isScanner && <BottomNav />}
      </div>

      {/* Global Modals & Toasts */}
      <DigitalPassModal />
      <ToastContainer />
    </div>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  User, 
  Home, 
  CalendarDays, 
  Ticket, 
  Bell, 
  CheckCircle2 
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentView, navigate } = useApp();

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'guest_home', label: 'My Passes', icon: <Ticket size={20} /> },
    { id: 'scanner', label: 'Scanner', icon: <QrCode size={20} /> },
    { id: 'guests', label: 'Guests', icon: <Users size={20} /> },
    { id: 'profile', label: 'Profile', icon: <User size={20} /> }
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentView === item.id ? 'active' : ''}`}
          onClick={() => navigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

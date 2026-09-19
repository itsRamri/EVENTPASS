/* ==========================================================================
   EVENTPASS — DATA STORE & PERSISTENCE (LOCAL STORAGE)
   ========================================================================== */

const STORAGE_KEY_PREFIX = 'eventpass_';

// Initial Seed Data
const DEFAULT_USER = {
  id: 'usr_manager_01',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@eventpass.io',
  mobile: '+91 98765 43210',
  role: 'manager', // 'manager', 'guest', 'scanner'
  status: 'active',
  avatar: '',
  college: 'National Institute of Technology',
  branch: 'Computer Science'
};

const DEFAULT_EVENTS = [
  {
    id: 'evt_fresher_2026',
    name: 'Mega Tech Fresher Gala 2026',
    tagline: 'Annual Flagship Induction & DJ Night',
    status: 'active', // 'active', 'draft', 'completed'
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    description: 'Welcome to the biggest celebration of the academic year! Featuring live performances, techno showcase, DJ night, refreshments, and interactive gaming arenas.',
    date: '2026-09-28',
    startTime: '18:00',
    endTime: '23:30',
    venue: 'Grand Central Auditorium, Campus East',
    location: 'Building 4, Sector 12, Tech City',
    organizer: 'Student Council & Tech Club',
    tokenSettings: {
      totalLimit: 500,
      tokenType: 'ALPHANUMERIC',
      prefix: 'EP-GALA',
      validity: '2026-09-28T23:59',
      autoGenerate: true,
      qrEnabled: true
    },
    requirements: [
      { id: 'req_1', label: 'Full Name', type: 'text', required: true, validation: 'min:3', description: 'Your legal name as per ID' },
      { id: 'req_2', label: 'College Email ID', type: 'email', required: true, validation: 'email', description: 'Official campus email address' },
      { id: 'req_3', label: 'Mobile Number', type: 'mobile', required: true, validation: 'mobile', description: 'Active WhatsApp number for alerts' },
      { id: 'req_4', label: 'College / Institute', type: 'dropdown', required: true, options: ['National Institute of Technology', 'IIT Bombay', 'BITS Pilani', 'Delhi University', 'Other'], description: 'Select your enrolled institution' },
      { id: 'req_5', label: 'Department / Branch', type: 'dropdown', required: true, options: ['Computer Science & Eng.', 'Electronics & Comm.', 'Mechanical Eng.', 'Biotechnology', 'Business Administration', 'Other'], description: 'Your current major' },
      { id: 'req_6', label: 'Student Roll Number', type: 'text', required: true, validation: 'alphanumeric', description: 'Official university registration number' },
      { id: 'req_7', label: 'ID Card Upload (Photo / PDF)', type: 'id_card', required: true, validation: 'maxSize:5MB', description: 'Clear photo or PDF of your student ID card' },
      { id: 'req_8', label: 'Dietary Preference', type: 'radio', required: false, options: ['Vegetarian', 'Non-Vegetarian', 'Vegan / Jain'], description: 'For dinner buffet allocation' }
    ],
    documents: [
      { id: 'doc_1', name: 'Event_Guidelines_Safety_Rules.pdf', size: '1.4 MB', uploadDate: '2026-09-10', type: 'pdf', url: '#' },
      { id: 'doc_2', name: 'DJ_Night_Schedule_&_Lineup.png', size: '2.8 MB', uploadDate: '2026-09-12', type: 'image', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'evt_hackathon_x',
    name: 'HackVision 36-Hour Hackathon',
    tagline: 'Code, Innovate, Win Big',
    status: 'active',
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
    description: 'National level hackathon bringing together 300+ developers, designers, and AI creators to build groundbreaking real-world solutions.',
    date: '2026-10-15',
    startTime: '09:00',
    endTime: '21:00',
    venue: 'Innovation Hub, Cyber Wing',
    location: 'Tech Park, Block B',
    organizer: 'Developer Student Club',
    tokenSettings: {
      totalLimit: 300,
      tokenType: 'ALPHANUMERIC',
      prefix: 'HACK-X',
      validity: '2026-10-16T21:00',
      autoGenerate: true,
      qrEnabled: true
    },
    requirements: [
      { id: 'req_h1', label: 'Team Name', type: 'text', required: true, description: 'Registered Team Name' },
      { id: 'req_h2', label: 'GitHub Profile Link', type: 'text', required: true, description: 'Personal or Team Portfolio' },
      { id: 'req_h3', label: 'Resume / CV (PDF)', type: 'pdf_upload', required: false, description: 'For sponsor hiring pool' }
    ],
    documents: [
      { id: 'doc_h1', name: 'Hackathon_Problem_Statements.pdf', size: '840 KB', uploadDate: '2026-09-14', type: 'pdf', url: '#' }
    ]
  },
  {
    id: 'evt_sunburn_campus',
    name: 'Sunburn Campus Sunset Acoustic',
    tagline: 'Live unplugged indie concert',
    status: 'completed',
    coverImage: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&auto=format&fit=crop&q=80',
    description: 'An evening of soulful acoustic melodies and open-air food trucks under the stars.',
    date: '2026-08-20',
    startTime: '17:00',
    endTime: '22:00',
    venue: 'Open Air Amphitheatre',
    location: 'North Campus Lakeview',
    organizer: 'Cultural Society',
    tokenSettings: {
      totalLimit: 800,
      tokenType: 'ALPHANUMERIC',
      prefix: 'ACOUSTIC',
      validity: '2026-08-20T23:00',
      autoGenerate: true,
      qrEnabled: true
    },
    requirements: [],
    documents: []
  }
];

const DEFAULT_GUESTS = [
  {
    id: 'gst_101',
    eventId: 'evt_fresher_2026',
    name: 'Shubham Kumar',
    email: 'shubham.k@gmail.com',
    mobile: '+91 91234 56789',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    college: 'National Institute of Technology',
    branch: 'Computer Science & Eng.',
    rollNo: '2023CSB1042',
    status: 'approved', // 'pending', 'approved', 'checkedin', 'rejected', 'blocked'
    token: 'EP-GALA-10284',
    passId: 'PASS-892147',
    registrationDate: '2026-09-15 14:20',
    checkInTime: null,
    answers: {
      'Full Name': 'Shubham Kumar',
      'College Email ID': 'shubham.2023cs@nit.edu',
      'Mobile Number': '+91 91234 56789',
      'College / Institute': 'National Institute of Technology',
      'Department / Branch': 'Computer Science & Eng.',
      'Student Roll Number': '2023CSB1042',
      'Dietary Preference': 'Vegetarian'
    },
    documents: [
      { name: 'Student_ID_Card.jpg', type: 'image', size: '1.2 MB', url: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'gst_102',
    eventId: 'evt_fresher_2026',
    name: 'Priya Verma',
    email: 'priya.verma@outlook.com',
    mobile: '+91 98221 12345',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    college: 'National Institute of Technology',
    branch: 'Electronics & Comm.',
    rollNo: '2023ECB2018',
    status: 'pending',
    token: 'EP-GALA-10285',
    passId: 'PASS-892148',
    registrationDate: '2026-09-16 09:45',
    checkInTime: null,
    answers: {
      'Full Name': 'Priya Verma',
      'College Email ID': 'priya.2023ec@nit.edu',
      'Mobile Number': '+91 98221 12345',
      'College / Institute': 'National Institute of Technology',
      'Department / Branch': 'Electronics & Comm.',
      'Student Roll Number': '2023ECB2018',
      'Dietary Preference': 'Non-Vegetarian'
    },
    documents: [
      { name: 'Priya_NIT_Card.pdf', type: 'pdf', size: '920 KB', url: '#' }
    ]
  },
  {
    id: 'gst_103',
    eventId: 'evt_fresher_2026',
    name: 'Rohan Deshmukh',
    email: 'rohan.desh@gmail.com',
    mobile: '+91 94567 89012',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    college: 'BITS Pilani',
    branch: 'Mechanical Eng.',
    rollNo: '2022MECH09',
    status: 'checkedin',
    token: 'EP-GALA-10190',
    passId: 'PASS-771923',
    registrationDate: '2026-09-14 11:15',
    checkInTime: '2026-09-16 16:30',
    answers: {
      'Full Name': 'Rohan Deshmukh',
      'College Email ID': 'rohan.d@bits.edu',
      'Mobile Number': '+91 94567 89012',
      'College / Institute': 'BITS Pilani',
      'Department / Branch': 'Mechanical Eng.',
      'Student Roll Number': '2022MECH09',
      'Dietary Preference': 'Vegetarian'
    },
    documents: [
      { name: 'BITS_ID_Verified.jpg', type: 'image', size: '2.1 MB', url: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'gst_104',
    eventId: 'evt_fresher_2026',
    name: 'Vikramaditya Roy',
    email: 'vikram.roy@yahoo.com',
    mobile: '+91 99887 76655',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    college: 'Other',
    branch: 'Other',
    rollNo: 'EXT-9921',
    status: 'blocked',
    token: 'EP-GALA-10002',
    passId: 'PASS-110293',
    registrationDate: '2026-09-13 18:30',
    checkInTime: null,
    answers: {
      'Full Name': 'Vikramaditya Roy',
      'College Email ID': 'vikram.roy@yahoo.com',
      'Mobile Number': '+91 99887 76655',
      'College / Institute': 'Other',
      'Department / Branch': 'Other',
      'Student Roll Number': 'EXT-9921',
      'Dietary Preference': 'Non-Vegetarian'
    },
    documents: []
  },
  {
    id: 'gst_105',
    eventId: 'evt_fresher_2026',
    name: 'Ananya Singhania',
    email: 'ananya.s@gmail.com',
    mobile: '+91 97654 32190',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    college: 'Delhi University',
    branch: 'Business Administration',
    rollNo: 'DU-BBA-451',
    status: 'rejected',
    token: 'EP-GALA-10311',
    passId: 'PASS-392810',
    registrationDate: '2026-09-12 15:40',
    checkInTime: null,
    answers: {
      'Full Name': 'Ananya Singhania',
      'College Email ID': 'ananya.s@du.ac.in',
      'Mobile Number': '+91 97654 32190',
      'College / Institute': 'Delhi University',
      'Department / Branch': 'Business Administration',
      'Student Roll Number': 'DU-BBA-451'
    },
    documents: []
  }
];

const DEFAULT_STAFF = [
  {
    id: 'stf_01',
    name: 'Karan Mehra',
    email: 'karan.scanner@eventpass.io',
    role: 'scanner',
    status: 'active',
    assignedEventId: 'evt_fresher_2026',
    permissions: {
      canScan: true,
      canCheckIn: true,
      canViewDetails: true,
      canApprove: false,
      canReject: false
    }
  },
  {
    id: 'stf_02',
    name: 'Neha Kapoor',
    email: 'neha.staff@eventpass.io',
    role: 'scanner',
    status: 'active',
    assignedEventId: 'evt_fresher_2026',
    permissions: {
      canScan: true,
      canCheckIn: true,
      canViewDetails: true,
      canApprove: true,
      canReject: true
    }
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'Registration Approved 🎉',
    message: 'Your pass for Mega Tech Fresher Gala 2026 has been approved! Open My Pass to view your QR ticket.',
    type: 'success',
    timestamp: '10 minutes ago',
    read: false
  },
  {
    id: 'notif_2',
    title: 'New Registration Submitted',
    message: 'Priya Verma submitted a registration request for Fresher Gala 2026.',
    type: 'info',
    timestamp: '1 hour ago',
    read: false
  },
  {
    id: 'notif_3',
    title: 'Scanner Access Granted',
    message: 'You have been granted QR scanner permissions for HackVision 36-Hour Hackathon.',
    type: 'warning',
    timestamp: 'Yesterday',
    read: true
  }
];

// Data Access Layer
class DataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'user')) {
      this.setUser(DEFAULT_USER);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'events')) {
      this.setEvents(DEFAULT_EVENTS);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'guests')) {
      this.setGuests(DEFAULT_GUESTS);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'staff')) {
      this.setStaff(DEFAULT_STAFF);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications')) {
      this.setNotifications(DEFAULT_NOTIFICATIONS);
    }
  }

  // User
  getUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + 'user')) || DEFAULT_USER;
  }
  setUser(user) {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user', JSON.stringify(user));
  }

  // Events
  getEvents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + 'events')) || [];
  }
  setEvents(events) {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'events', JSON.stringify(events));
  }
  getEventById(id) {
    return this.getEvents().find(e => e.id === id);
  }
  saveEvent(event) {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      events.unshift(event);
    }
    this.setEvents(events);
  }
  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    this.setEvents(events);
    // Remove all associated guests
    const guests = this.getGuests().filter(g => g.eventId !== id);
    this.setGuests(guests);
  }

  // Guests
  getGuests() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + 'guests')) || [];
  }
  setGuests(guests) {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'guests', JSON.stringify(guests));
  }
  getGuestById(id) {
    return this.getGuests().find(g => g.id === id);
  }
  getGuestByToken(tokenOrPassId) {
    const query = tokenOrPassId.trim().toUpperCase();
    return this.getGuests().find(g => 
      (g.token && g.token.toUpperCase() === query) || 
      (g.passId && g.passId.toUpperCase() === query)
    );
  }
  saveGuest(guest) {
    const guests = this.getGuests();
    const idx = guests.findIndex(g => g.id === guest.id);
    if (idx >= 0) {
      guests[idx] = guest;
    } else {
      guests.unshift(guest);
    }
    this.setGuests(guests);
  }
  deleteGuest(id) {
    const guests = this.getGuests().filter(g => g.id !== id);
    this.setGuests(guests);
  }

  // Staff
  getStaff() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + 'staff')) || [];
  }
  setStaff(staff) {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'staff', JSON.stringify(staff));
  }
  saveStaff(member) {
    const staff = this.getStaff();
    const idx = staff.findIndex(s => s.id === member.id);
    if (idx >= 0) {
      staff[idx] = member;
    } else {
      staff.unshift(member);
    }
    this.setStaff(staff);
  }
  deleteStaff(id) {
    const staff = this.getStaff().filter(s => s.id !== id);
    this.setStaff(staff);
  }

  // Notifications
  getNotifications() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + 'notifications')) || [];
  }
  setNotifications(notifs) {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'notifications', JSON.stringify(notifs));
  }
  addNotification(notif) {
    const notifs = this.getNotifications();
    notifs.unshift({
      id: 'notif_' + Date.now(),
      timestamp: 'Just now',
      read: false,
      ...notif
    });
    this.setNotifications(notifs);
  }

  // Reset to seed data
  resetAll() {
    localStorage.clear();
    this.init();
  }
}

const db = new DataStore();

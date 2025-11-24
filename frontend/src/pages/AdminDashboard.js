import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { APIProvider } from '@vis.gl/react-google-maps';
import LocationMapPicker from '@/components/LocationMapPicker';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state management
  const [activeTab, setActiveTab] = useState("pending-courses");
  const [activeSchoolTab, setActiveSchoolTab] = useState("locations");

  // Admin School Management States
  const [adminSchool, setAdminSchool] = useState(null);
  const [adminLocations, setAdminLocations] = useState([]);
  const [adminInstructors, setAdminInstructors] = useState([]);
  const [adminPrograms, setAdminPrograms] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  
  // Dialog states for admin school
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [instructorDialogOpen, setInstructorDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  
  // Form states for admin school
  const [locationForm, setLocationForm] = useState({
    name: '', address: '', city: '', prefecture: '', capacity: '', facilities: '', 
    facility_images: [], google_maps_url: '', description: '', latitude: null, longitude: null
  });
  const [instructorForm, setInstructorForm] = useState({
    name: '', email: '', phone: '', rank: '', years_experience: '', bio: '', specialties: ''
  });
  const [programForm, setProgramForm] = useState({
    location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido',
    course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', 
    class_type: 'group', price: '', currency: 'JPY', capacity: '', prerequisites: '', 
    start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', image_url: ''
  });

  // User Management States
  const [users, setUsers] = useState([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'student', phone: '', school_id: '', instructor_id: ''
  });

  useEffect(() => {
    fetchAdminData();
    fetchAdminSchoolData();
    fetchUsers();
  }, []);

  const fetchAdminData = async () => {
    try {
      console.log('Fetching admin data...');
      const [statsRes, schoolsRes, programsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/schools`, { withCredentials: true }),
        axios.get(`${API}/admin/programs`, { withCredentials: true })
      ]);
      
      console.log('Admin data fetched:', {
        stats: statsRes.data,
        schools: schoolsRes.data.length,
        programs: programsRes.data.length
      });
      
      setStats(statsRes.data);
      setSchools(schoolsRes.data);
      setPrograms(programsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load admin data: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminSchoolData = async () => {
    try {
      console.log('Fetching admin school data...');
      const schoolRes = await axios.get(`${API}/schools/my/school`, { withCredentials: true });
      setAdminSchool(schoolRes.data);
      console.log('Admin school fetched:', schoolRes.data);

      const [locsRes, instsRes, progsRes, booksRes] = await Promise.all([
        axios.get(`${API}/locations?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/instructors?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/courses?school_id=${schoolRes.data.id}`),
        axios.get(`${API}/schools/${schoolRes.data.id}/bookings`, { withCredentials: true })
      ]);
      
      console.log('Admin school details fetched:', {
        locations: locsRes.data.length,
        instructors: instsRes.data.length,
        programs: progsRes.data.length,
        bookings: booksRes.data.length
      });
      
      setAdminLocations(locsRes.data);
      setAdminInstructors(instsRes.data);
      setAdminPrograms(progsRes.data);
      setAdminBookings(booksRes.data);
    } catch (error) {
      console.error('Failed to fetch admin school data:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load school data: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleApproveSchool = async (schoolId) => {
    try {
      await axios.patch(`${API}/schools/${schoolId}/approve`, {}, { withCredentials: true });
      toast.success('School approved successfully');
      fetchAdminData();
    } catch (error) {
      console.error('Failed to approve school:', error);
      toast.error('Failed to approve school');
    }
  };

  const handleApproveFirstCourse = async (courseId) => {
    try {
      await axios.patch(`${API}/courses/${courseId}/approve-first`, {}, { withCredentials: true });
      toast.success('First course approved! School can now create courses without approval.');
      fetchAdminData();
    } catch (error) {
      console.error('Failed to approve course:', error);
      toast.error(error.response?.data?.detail || 'Failed to approve course');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Admin School - Location handlers
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...locationForm, 
        capacity: parseInt(locationForm.capacity), 
        facilities: locationForm.facilities.split(',').map(f => f.trim()).filter(f => f) 
      };
      await axios.post(`${API}/locations`, payload, { withCredentials: true });
      toast.success('Location created successfully');
      setLocationDialogOpen(false);
      setLocationForm({ 
        name: '', address: '', city: '', prefecture: '', capacity: '', facilities: '', 
        facility_images: [], google_maps_url: '', description: '', latitude: null, longitude: null 
      });
      fetchAdminSchoolData();
    } catch (error) {
      toast.error('Failed to create location');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await axios.delete(`${API}/locations/${id}`, { withCredentials: true });
      toast.success('Location deleted');
      fetchAdminSchoolData();
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  // Admin School - Instructor handlers
  const handleCreateInstructor = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...instructorForm, 
        years_experience: instructorForm.years_experience ? parseInt(instructorForm.years_experience) : null, 
        specialties: instructorForm.specialties.split(',').map(s => s.trim()).filter(s => s) 
      };
      await axios.post(`${API}/instructors`, payload, { withCredentials: true });
      toast.success('Instructor added successfully');
      setInstructorDialogOpen(false);
      setInstructorForm({ name: '', email: '', phone: '', rank: '', years_experience: '', bio: '', specialties: '' });
      fetchAdminSchoolData();
    } catch (error) {
      toast.error('Failed to add instructor');
    }
  };

  const handleDeleteInstructor = async (id) => {
    if (!window.confirm('Delete this instructor?')) return;
    try {
      await axios.delete(`${API}/instructors/${id}`, { withCredentials: true });
      toast.success('Instructor deleted');
      fetchAdminSchoolData();
    } catch (error) {
      toast.error('Failed to delete instructor');
    }
  };

  // Admin School - Program handlers
  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...programForm,
        price: parseFloat(programForm.price),
        capacity: parseInt(programForm.capacity)
      };
      
      if (editingProgram) {
        // Update existing program
        await axios.put(`${API}/courses/${editingProgram.id}`, payload, { withCredentials: true });
        toast.success('Program updated successfully');
      } else {
        // Create new program
        await axios.post(`${API}/courses`, payload, { withCredentials: true });
        toast.success('Program created successfully');
      }
      
      setProgramDialogOpen(false);
      setEditingProgram(null);
      setProgramForm({
        location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido',
        course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', 
        class_type: 'group', price: '', currency: 'JPY', capacity: '', prerequisites: '', 
        start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', image_url: ''
      });
      fetchAdminSchoolData();
    } catch (error) {
      toast.error(editingProgram ? 'Failed to update program' : 'Failed to create program');
    }
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setProgramForm({
      location_id: program.location_id || '',
      instructor_id: program.instructor_id || '',
      title: program.title || '',
      description: program.description || '',
      martial_arts_style: program.martial_arts_style || 'Aikido',
      course_category: program.course_category || 'Martial Arts',
      category: program.category || 'Martial Arts',
      experience_level: program.experience_level || 'beginner',
      class_type: program.class_type || 'group',
      price: program.price?.toString() || '',
      currency: program.currency || 'JPY',
      capacity: program.capacity?.toString() || '',
      prerequisites: program.prerequisites || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      daily_start_time: program.daily_start_time || '09:00',
      daily_end_time: program.daily_end_time || '17:00',
      image_url: program.image_url || ''
    });
    setProgramDialogOpen(true);
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Delete this program?')) return;
    try {
      await axios.delete(`${API}/courses/${id}`, { withCredentials: true });
      toast.success('Program deleted');
      fetchAdminSchoolData();
    } catch (error) {
      toast.error('Failed to delete program');
    }
  };

  // ==================== USER MANAGEMENT FUNCTIONS ====================

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Validate instructor requires school
      if (userForm.role === 'instructor' && !userForm.school_id) {
        toast.error('Please select a school for instructor');
        return;
      }
      
      if (editingUser) {
        // Update existing user
        const updateData = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          phone: userForm.phone || null,
          school_id: userForm.school_id || null,
          instructor_id: userForm.instructor_id || null
        };
        
        // Include password only if it's been changed (not empty)
        if (userForm.password && userForm.password.trim() !== '') {
          if (userForm.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
          }
          updateData.password = userForm.password;
        }
        
        await axios.put(`${API}/admin/users/${editingUser.id}`, updateData, { withCredentials: true });
        toast.success('User updated successfully');
      } else {
        // Create new user
        if (!userForm.password || userForm.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        await axios.post(`${API}/admin/users`, userForm, { withCredentials: true });
        toast.success('User created successfully');
      }
      
      setUserDialogOpen(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role: 'student', phone: '', school_id: '', instructor_id: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || (editingUser ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '', // Don't populate password
      role: user.role,
      phone: user.phone || '',
      school_id: user.school_id || '',
      instructor_id: user.instructor_id || ''
    });
    setUserDialogOpen(true);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This will delete all their related data (schools, locations, instructors, courses, bookings, sessions).`)) {
      return;
    }
    
    try {
      const response = await axios.delete(`${API}/admin/users/${userId}`, { 
        withCredentials: true 
      });
      
      toast.success(`User "${userName}" and all related data deleted successfully`);
      
      // Show what was deleted
      if (response.data.deleted) {
        console.log('Deleted items:', response.data.deleted);
      }
      
      fetchUsers();
      fetchAdminSchoolData(); // Refresh school data too
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete user';
      toast.error(errorMsg);
    }
  };

  const handleDeleteSchool = async (schoolId, schoolName) => {
    if (!window.confirm(`Are you sure you want to delete school "${schoolName}"? This will delete all locations, instructors, courses, and bookings associated with this school.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admin/schools/${schoolId}`, { 
        withCredentials: true 
      });
      
      toast.success(`School "${schoolName}" and all related data deleted successfully`);
      fetchAdminData();
      fetchUsers(); // Refresh users too
    } catch (error) {
      console.error('Failed to delete school:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete school';
      toast.error(errorMsg);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admin/bookings/${bookingId}`, { 
        withCredentials: true 
      });
      
      toast.success('Booking deleted successfully');
      fetchAdminSchoolData();
    } catch (error) {
      console.error('Failed to delete booking:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete booking';
      toast.error(errorMsg);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" onClick={() => navigate('/')} className="text-2xl font-bold text-slate-900 cursor-pointer" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-6">
            <span className="text-slate-700 font-medium">Admin Panel</span>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div data-testid="admin-dashboard" className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Admin Dashboard</h1>

        {/* Stats Cards - Clickable */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("schools")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="total-schools" className="text-3xl font-bold text-slate-900">{stats?.total_schools || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.approved_schools || 0} approved</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("pending-courses")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Pending Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="pending-classes" className="text-3xl font-bold text-emerald-700">{stats?.pending_courses || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to approve</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("programs")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="total-programs" className="text-3xl font-bold text-slate-900">{stats?.total_courses || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.active_courses || 0} active</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("programs")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="total-bookings" className="text-3xl font-bold text-slate-900">{stats?.total_bookings || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.paid_bookings || 0} paid</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Analytics - Clickable */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-green-500"
            onClick={() => setActiveTab("programs")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                ¥{stats?.total_revenue ? stats.total_revenue.toLocaleString('ja-JP') : '0'}
              </p>
              <p className="text-xs text-slate-500 mt-1">From paid bookings</p>
              <p className="text-xs text-green-600 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-emerald-50 border-emerald-200 cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-600"
            onClick={() => setActiveTab("programs")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-emerald-700">Booking Fees Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">
                ¥{stats?.total_booking_fees ? stats.total_booking_fees.toLocaleString('ja-JP') : '0'}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Platform revenue (9%)</p>
              <p className="text-xs text-emerald-700 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow hover:border-blue-600"
            onClick={() => setActiveTab("programs")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-700">Sales Tax Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">
                ¥{stats?.total_sales_tax ? stats.total_sales_tax.toLocaleString('ja-JP') : '0'}
              </p>
              <p className="text-xs text-blue-600 mt-1">Tax collected (10%)</p>
              <p className="text-xs text-blue-700 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-purple-50 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow hover:border-purple-600"
            onClick={() => setActiveTab("schools")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-purple-700">School Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">
                ¥{stats?.total_school_earnings ? stats.total_school_earnings.toLocaleString('ja-JP') : '0'}
              </p>
              <p className="text-xs text-purple-600 mt-1">Paid to schools</p>
              <p className="text-xs text-purple-700 mt-2 font-medium">→ Click to view</p>
            </CardContent>
          </Card>
        </div>

        {/* Locations & Instructors - Clickable */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("schools")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_locations || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Training facilities</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view schools</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
            onClick={() => setActiveTab("schools")}
          >
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Instructors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_instructors || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Registered instructors</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view schools</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Mobile Responsive */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto gap-1">
            <TabsTrigger data-testid="pending-courses-tab" value="pending-courses" className="text-xs md:text-sm py-2 px-2">
              <span className="hidden md:inline">Pending First Courses</span>
              <span className="md:hidden">Pending</span>
            </TabsTrigger>
            <TabsTrigger data-testid="schools-tab" value="schools" className="text-xs md:text-sm py-2 px-2">
              Schools
            </TabsTrigger>
            <TabsTrigger data-testid="programs-tab" value="programs" className="text-xs md:text-sm py-2 px-2">
              <span className="hidden md:inline">All Programs</span>
              <span className="md:hidden">Programs</span>
            </TabsTrigger>
            <TabsTrigger data-testid="users-tab" value="users" className="text-xs md:text-sm py-2 px-2">
              Users
            </TabsTrigger>
            <TabsTrigger data-testid="my-school-tab" value="my-school" className="text-xs md:text-sm py-2 px-2">
              My School
            </TabsTrigger>
          </TabsList>

          {/* Pending First Courses Tab */}
          <TabsContent value="pending-courses" className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Spectral, serif' }}>Approve First Courses</h2>
            <p className="text-slate-600 mb-6">Each school needs approval for their first course. After approval, they can create courses freely.</p>

            {programs.filter(p => p.status === 'pending_first_approval').length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-slate-600">No courses pending approval.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {programs.filter(p => p.status === 'pending_first_approval').map((program, idx) => (
                  <Card key={program.id} className="overflow-hidden">
                    <div className="flex">
                      <img src={program.image_url} alt={program.title} className="w-48 h-48 object-cover" />
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Spectral, serif' }}>{program.title}</h3>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">{program.category}</span>
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            First Course - Needs Approval
                          </span>
                        </div>
                        <p className="text-slate-600 mb-4">{program.description}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <p className="text-slate-600"><strong>Price:</strong> ¥{program.price?.toLocaleString('ja-JP')}</p>
                          <p className="text-slate-600"><strong>Duration:</strong> {program.duration}</p>
                          <p className="text-slate-600"><strong>Capacity:</strong> {program.capacity} students</p>
                          <p className="text-slate-600"><strong>Level:</strong> {program.experience_level}</p>
                        </div>
                        <Button
                          onClick={() => handleApproveFirstCourse(program.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✅ Approve First Course
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Schools Tab */}
          <TabsContent value="schools" className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Spectral, serif' }}>Manage Schools</h2>

            {schools.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p data-testid="no-schools-msg" className="text-slate-600">No schools registered yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {schools.map((school, idx) => (
                  <Card key={school.id} data-testid={`school-card-${idx}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl" style={{ fontFamily: 'Spectral, serif' }}>{school.name}</CardTitle>
                          <p className="text-slate-600 mt-1">{school.location}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          school.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{school.approved ? 'Approved' : 'Pending'}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 mb-4">{school.description}</p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600"><strong>Email:</strong> {school.contact_email}</p>
                          {school.contact_phone && <p className="text-slate-600"><strong>Phone:</strong> {school.contact_phone}</p>}
                        </div>
                        <div>
                          {school.website && <p className="text-slate-600"><strong>Website:</strong> <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">{school.website}</a></p>}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        {!school.approved && (
                          <Button 
                            data-testid={`approve-school-${idx}`}
                            onClick={() => handleApproveSchool(school.id)} 
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve School
                          </Button>
                        )}
                        <Button 
                          data-testid={`delete-school-${idx}`}
                          onClick={() => handleDeleteSchool(school.id, school.name)} 
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete School
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Spectral, serif' }}>All Programs</h2>

            {programs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p data-testid="no-programs-msg" className="text-slate-600">No programs created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program, idx) => (
                  <Card key={program.id} data-testid={`program-card-${idx}`} className="overflow-hidden">
                    <img src={program.image_url} alt={program.title} className="w-full h-40 object-cover" />
                    <CardHeader>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full w-fit mb-2">{program.category}</span>
                      <CardTitle className="text-lg" style={{ fontFamily: 'Spectral, serif' }}>{program.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-2"><strong>Price:</strong> ¥{program.price?.toLocaleString('ja-JP')}</p>
                      <p className="text-sm text-slate-600"><strong>Duration:</strong> {program.duration}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My School Tab - Admin School Management */}
          <TabsContent value="my-school" className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Spectral, serif' }}>
              My School Dashboard
            </h2>
            <p className="text-slate-600 mb-6">
              Manage your admin school - create locations, add instructors, and publish programs.
            </p>

            {adminSchool && (
              <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Spectral, serif' }}>{adminSchool.name}</CardTitle>
                  <CardDescription>{adminSchool.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 mb-2">{adminSchool.bio}</p>
                  <p className="text-sm text-slate-600">
                    <strong>Contact:</strong> {adminSchool.contact_email} | <strong>Location:</strong> {adminSchool.location}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Admin School Stats - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
                onClick={() => setActiveSchoolTab("locations")}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{adminLocations.length}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to manage</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
                onClick={() => setActiveSchoolTab("instructors")}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Instructors</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{adminInstructors.length}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to manage</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
                onClick={() => setActiveSchoolTab("admin-programs")}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Programs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{adminPrograms.length}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to manage</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-emerald-500"
                onClick={() => setActiveSchoolTab("bookings")}
              >
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{adminBookings.length}</p>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">→ Click to view</p>
                </CardContent>
              </Card>
            </div>

            {/* Admin School Sub-tabs - Mobile Responsive */}
            <Tabs value={activeSchoolTab} onValueChange={setActiveSchoolTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
                <TabsTrigger value="locations" className="text-xs md:text-sm py-2">Locations</TabsTrigger>
                <TabsTrigger value="instructors" className="text-xs md:text-sm py-2">Instructors</TabsTrigger>
                <TabsTrigger value="admin-programs" className="text-xs md:text-sm py-2">Programs</TabsTrigger>
                <TabsTrigger value="bookings" className="text-xs md:text-sm py-2">Bookings</TabsTrigger>
              </TabsList>

              {/* Locations Sub-tab */}
              <TabsContent value="locations" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Training Locations</h3>
                  <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-700 hover:bg-emerald-800">+ Add Location</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Training Location</DialogTitle>
                        <DialogDescription>Create a new training facility location</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateLocation} className="space-y-4">
                        <div>
                          <Label>Location Name *</Label>
                          <Input 
                            value={locationForm.name} 
                            onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Address *</Label>
                          <Input 
                            value={locationForm.address} 
                            onChange={(e) => setLocationForm({...locationForm, address: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Pin Location on Map</Label>
                          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                            <LocationMapPicker
                              onLocationSelect={(locationData) => {
                                console.log('Location selected:', locationData);
                                setLocationForm({
                                  ...locationForm,
                                  latitude: locationData.lat,
                                  longitude: locationData.lng,
                                  address: locationData.address,
                                  prefecture: locationData.prefecture,
                                  city: locationData.city
                                });
                              }}
                              initialPosition={
                                locationForm.latitude && locationForm.longitude
                                  ? { lat: locationForm.latitude, lng: locationForm.longitude }
                                  : null
                              }
                              addressToGeocode={locationForm.address}
                            />
                          </APIProvider>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>City *</Label>
                            <Input 
                              value={locationForm.city} 
                              onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                              required 
                            />
                          </div>
                          <div>
                            <Label>Prefecture *</Label>
                            <Input 
                              value={locationForm.prefecture} 
                              onChange={(e) => setLocationForm({...locationForm, prefecture: e.target.value})}
                              required 
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Capacity *</Label>
                          <Input 
                            type="number" 
                            value={locationForm.capacity} 
                            onChange={(e) => setLocationForm({...locationForm, capacity: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Facilities (comma-separated)</Label>
                          <Input 
                            value={locationForm.facilities} 
                            onChange={(e) => setLocationForm({...locationForm, facilities: e.target.value})}
                            placeholder="Dojo, Changing Rooms, Showers"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea 
                            value={locationForm.description} 
                            onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                            rows={3}
                          />
                        </div>
                        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                          Create Location
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {adminLocations.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-slate-600">No locations yet. Add your first training location!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {adminLocations.map((location) => (
                      <Card key={location.id}>
                        <CardHeader>
                          <CardTitle>{location.name}</CardTitle>
                          <CardDescription>{location.city}, {location.prefecture}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-600 mb-2">{location.address}</p>
                          <p className="text-sm text-slate-600"><strong>Capacity:</strong> {location.capacity} students</p>
                          {location.facilities && location.facilities.length > 0 && (
                            <p className="text-sm text-slate-600"><strong>Facilities:</strong> {location.facilities.join(', ')}</p>
                          )}
                          <Button 
                            onClick={() => handleDeleteLocation(location.id)} 
                            variant="destructive" 
                            size="sm" 
                            className="mt-4"
                          >
                            Delete
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Instructors Sub-tab */}
              <TabsContent value="instructors" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Instructors</h3>
                  <Dialog open={instructorDialogOpen} onOpenChange={setInstructorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-700 hover:bg-emerald-800">+ Add Instructor</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Instructor</DialogTitle>
                        <DialogDescription>Add a new instructor to your school</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateInstructor} className="space-y-4">
                        <div>
                          <Label>Name *</Label>
                          <Input 
                            value={instructorForm.name} 
                            onChange={(e) => setInstructorForm({...instructorForm, name: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input 
                            type="email"
                            value={instructorForm.email} 
                            onChange={(e) => setInstructorForm({...instructorForm, email: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input 
                            value={instructorForm.phone} 
                            onChange={(e) => setInstructorForm({...instructorForm, phone: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Rank</Label>
                            <Input 
                              value={instructorForm.rank} 
                              onChange={(e) => setInstructorForm({...instructorForm, rank: e.target.value})}
                              placeholder="e.g., 5th Dan Black Belt"
                            />
                          </div>
                          <div>
                            <Label>Years of Experience</Label>
                            <Input 
                              type="number"
                              value={instructorForm.years_experience} 
                              onChange={(e) => setInstructorForm({...instructorForm, years_experience: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Bio</Label>
                          <Textarea 
                            value={instructorForm.bio} 
                            onChange={(e) => setInstructorForm({...instructorForm, bio: e.target.value})}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Specialties (comma-separated)</Label>
                          <Input 
                            value={instructorForm.specialties} 
                            onChange={(e) => setInstructorForm({...instructorForm, specialties: e.target.value})}
                            placeholder="Aikido, Judo, Weapons Training"
                          />
                        </div>
                        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                          Add Instructor
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {adminInstructors.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-slate-600">No instructors yet. Add your first instructor!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminInstructors.map((instructor) => (
                      <Card key={instructor.id}>
                        <CardHeader>
                          <CardTitle>{instructor.name}</CardTitle>
                          {instructor.rank && <CardDescription>{instructor.rank}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-600 mb-2">{instructor.email}</p>
                          {instructor.years_experience && (
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Experience:</strong> {instructor.years_experience} years
                            </p>
                          )}
                          {instructor.specialties && instructor.specialties.length > 0 && (
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Specialties:</strong> {instructor.specialties.join(', ')}
                            </p>
                          )}
                          <Button 
                            onClick={() => handleDeleteInstructor(instructor.id)} 
                            variant="destructive" 
                            size="sm" 
                            className="mt-4"
                          >
                            Delete
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Programs Sub-tab */}
              <TabsContent value="admin-programs" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Training Programs</h3>
                  <Dialog open={programDialogOpen} onOpenChange={(open) => {
                    setProgramDialogOpen(open);
                    if (!open) {
                      setEditingProgram(null);
                      setProgramForm({
                        location_id: '', instructor_id: '', title: '', description: '', martial_arts_style: 'Aikido',
                        course_category: 'Martial Arts', category: 'Martial Arts', experience_level: 'beginner', 
                        class_type: 'group', price: '', currency: 'JPY', capacity: '', prerequisites: '', 
                        start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', image_url: ''
                      });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-700 hover:bg-emerald-800">+ Create Program</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingProgram ? 'Edit Training Program' : 'Create Training Program'}</DialogTitle>
                        <DialogDescription>
                          {editingProgram ? 'Update your training program details' : 'Add a new training program to your school'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateProgram} className="space-y-4">
                        <div>
                          <Label>Program Title *</Label>
                          <Input 
                            value={programForm.title} 
                            onChange={(e) => setProgramForm({...programForm, title: e.target.value})}
                            required 
                          />
                        </div>
                        <div>
                          <Label>Description *</Label>
                          <Textarea 
                            value={programForm.description} 
                            onChange={(e) => setProgramForm({...programForm, description: e.target.value})}
                            rows={4}
                            required 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Location *</Label>
                            <Select 
                              value={programForm.location_id} 
                              onValueChange={(value) => setProgramForm({...programForm, location_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {adminLocations.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Instructor *</Label>
                            <Select 
                              value={programForm.instructor_id} 
                              onValueChange={(value) => setProgramForm({...programForm, instructor_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select instructor" />
                              </SelectTrigger>
                              <SelectContent>
                                {adminInstructors.map((inst) => (
                                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Martial Arts Style *</Label>
                            <Select 
                              value={programForm.martial_arts_style} 
                              onValueChange={(value) => setProgramForm({...programForm, martial_arts_style: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Aikido">Aikido</SelectItem>
                                <SelectItem value="Judo">Judo</SelectItem>
                                <SelectItem value="Karate">Karate</SelectItem>
                                <SelectItem value="Kendo">Kendo</SelectItem>
                                <SelectItem value="Iaido">Iaido</SelectItem>
                                <SelectItem value="Kyudo">Kyudo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Experience Level *</Label>
                            <Select 
                              value={programForm.experience_level} 
                              onValueChange={(value) => setProgramForm({...programForm, experience_level: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Class Type *</Label>
                            <Select 
                              value={programForm.class_type} 
                              onValueChange={(value) => setProgramForm({...programForm, class_type: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="group">Group</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Price (JPY) *</Label>
                            <Input 
                              type="number"
                              value={programForm.price} 
                              onChange={(e) => setProgramForm({...programForm, price: e.target.value})}
                              required 
                            />
                          </div>
                          <div>
                            <Label>Capacity *</Label>
                            <Input 
                              type="number"
                              value={programForm.capacity} 
                              onChange={(e) => setProgramForm({...programForm, capacity: e.target.value})}
                              required 
                            />
                          </div>
                          <div>
                            <Label>Currency</Label>
                            <Input value="JPY" disabled />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <Input 
                              type="date"
                              value={programForm.start_date} 
                              onChange={(e) => setProgramForm({...programForm, start_date: e.target.value})}
                              required 
                            />
                          </div>
                          <div>
                            <Label>End Date *</Label>
                            <Input 
                              type="date"
                              value={programForm.end_date} 
                              onChange={(e) => setProgramForm({...programForm, end_date: e.target.value})}
                              required 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Daily Start Time *</Label>
                            <Input 
                              type="time"
                              value={programForm.daily_start_time} 
                              onChange={(e) => setProgramForm({...programForm, daily_start_time: e.target.value})}
                              required 
                            />
                          </div>
                          <div>
                            <Label>Daily End Time *</Label>
                            <Input 
                              type="time"
                              value={programForm.daily_end_time} 
                              onChange={(e) => setProgramForm({...programForm, daily_end_time: e.target.value})}
                              required 
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Program Image</Label>
                          <ImageUpload
                            onImageUploaded={(url) => setProgramForm({...programForm, image_url: url})}
                            currentImage={programForm.image_url}
                          />
                        </div>
                        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                          {editingProgram ? 'Update Program' : 'Create Program'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {adminPrograms.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-slate-600">No programs yet. Create your first training program!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminPrograms.map((program) => (
                      <Card key={program.id} className="overflow-hidden">
                        {program.image_url && (
                          <img src={program.image_url} alt={program.title} className="w-full h-40 object-cover" />
                        )}
                        <CardHeader>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full w-fit mb-2">
                            {program.martial_arts_style || program.category}
                          </span>
                          <CardTitle>{program.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-600 mb-2">{program.description?.substring(0, 100)}...</p>
                          <p className="text-sm text-slate-600"><strong>Price:</strong> ¥{program.price?.toLocaleString('ja-JP')}</p>
                          <p className="text-sm text-slate-600"><strong>Capacity:</strong> {program.capacity} students</p>
                          <p className="text-sm text-slate-600"><strong>Level:</strong> {program.experience_level}</p>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              onClick={() => handleEditProgram(program)} 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                            >
                              Edit
                            </Button>
                            <Button 
                              onClick={() => handleDeleteProgram(program.id)} 
                              variant="destructive" 
                              size="sm" 
                              className="flex-1"
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Bookings Sub-tab */}
              <TabsContent value="bookings" className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Bookings</h3>

                {adminBookings.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-slate-600">No bookings yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {adminBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{booking.program_title || 'Program'}</CardTitle>
                              <CardDescription>{booking.student_name} ({booking.student_email})</CardDescription>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              booking.status === 'paid' ? 'bg-green-100 text-green-700' : 
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <p className="text-slate-600"><strong>Amount:</strong> ¥{booking.price?.toLocaleString('ja-JP')}</p>
                            <p className="text-slate-600"><strong>Booked:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
                            <p className="text-slate-600"><strong>Booking ID:</strong> {booking.id?.substring(0, 8)}...</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Users Management Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Spectral, serif' }}>User Management</h2>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ name: '', email: '', password: '', role: 'student', phone: '' });
                    }}
                  >
                    + Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Update user information' : 'Add a new user to the platform'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input 
                        value={userForm.name} 
                        onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input 
                        type="email"
                        value={userForm.email} 
                        onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <Label>{editingUser ? 'New Password (optional)' : 'Password *'}</Label>
                      <Input 
                        type="password"
                        value={userForm.password} 
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        required={!editingUser}
                        placeholder={editingUser ? "Leave blank to keep current password" : "Min 6 characters"}
                      />
                      {editingUser && (
                        <p className="text-xs text-slate-500 mt-1">
                          Leave blank to keep the current password. Enter a new password to change it.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Role *</Label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                        value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                      >
                        <option value="student">Student</option>
                        <option value="school">School</option>
                        <option value="admin">Admin</option>
                        <option value="instructor">Instructor</option>
                      </select>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input 
                        type="tel"
                        value={userForm.phone} 
                        onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                      />
                    </div>
                    
                    {/* School selection for instructor role */}
                    {userForm.role === 'instructor' && (
                      <div>
                        <Label>School (for Instructor) *</Label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          value={userForm.school_id}
                          onChange={(e) => setUserForm({...userForm, school_id: e.target.value})}
                          required={userForm.role === 'instructor'}
                        >
                          <option value="">Select a school...</option>
                          {schools.map(school => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                      {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <Input 
                placeholder="Search users by name, email, or role..." 
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto" style={{ position: 'relative', zIndex: 1 }}>
                  <table className="w-full" style={{ position: 'relative' }}>
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-slate-700">Name</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-700">Email</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-700">Role</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-700">Phone</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-700">Created</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-600">
                            {userSearchQuery ? 'No users found matching your search.' : 'No users yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((userRow) => (
                          <tr key={userRow.id} className="hover:bg-slate-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={userRow.picture} 
                                  alt={userRow.name}
                                  className="w-10 h-10 rounded-full"
                                />
                                <span className="font-medium text-slate-900">{userRow.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-600">{userRow.email}</td>
                            <td className="p-4">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                userRow.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                userRow.role === 'school' ? 'bg-blue-100 text-blue-700' : 
                                userRow.role === 'instructor' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {userRow.role}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-slate-600">{userRow.phone || '-'}</td>
                            <td className="p-4 text-sm text-slate-600">
                              {new Date(userRow.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditUser(userRow);
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer z-10 relative"
                                  style={{ pointerEvents: 'auto' }}
                                >
                                  Edit
                                </button>
                                {userRow.id === user?.id ? (
                                  <button 
                                    type="button"
                                    disabled
                                    title="Cannot delete your own account"
                                    className="px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-100 border border-slate-300 rounded-md cursor-not-allowed z-10 relative"
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteUser(userRow.id, userRow.name);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 active:bg-red-800 transition-colors cursor-pointer z-10 relative"
                                    style={{ pointerEvents: 'auto' }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-700">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Schools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-700">
                    {users.filter(u => u.role === 'school').length}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [programs, setPrograms] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`, { withCredentials: true });
      setBookings(response.data);
      
      // Fetch program details for each booking
      const programIds = [...new Set(response.data.map(b => b.course_id))];
      const programPromises = programIds.map(id => axios.get(`${API}/programs/${id}`));
      const programResponses = await Promise.all(programPromises);
      
      const programsMap = {};
      programResponses.forEach(res => {
        programsMap[res.data.id] = res.data;
      });
      setPrograms(programsMap);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" onClick={() => navigate('/')} className="text-2xl font-bold text-slate-900 cursor-pointer" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/programs')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">Browse Programs</button>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div data-testid="student-dashboard" className="max-w-7xl mx-auto px-6 py-12">
        {/* Profile Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 data-testid="user-name" className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Spectral, serif' }}>{user?.name}</h2>
                <p data-testid="user-email" className="text-slate-600">{user?.email}</p>
                <span className="inline-block mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">Student</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>My Bookings</h2>
            <Button data-testid="browse-programs-btn" onClick={() => navigate('/programs')} className="bg-emerald-700 hover:bg-emerald-800">Browse More Programs</Button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p data-testid="no-bookings-msg" className="text-slate-600 mb-4">You haven't made any bookings yet.</p>
                <Button onClick={() => navigate('/programs')} className="bg-emerald-700 hover:bg-emerald-800">Explore Programs</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {bookings.map((booking, idx) => {
                const program = programs[booking.course_id];
                return (
                  <Card key={booking.id} data-testid={`booking-card-${idx}`} className="hover:shadow-lg transition-shadow">
                    {program && (
                      <div className="h-32 overflow-hidden">
                        <img src={program.image_url} alt={program.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          booking.payment_status === 'paid' && booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.payment_status === 'paid' ? 'Confirmed' : booking.status}
                        </span>
                        {booking.payment_status && (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            booking.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl" style={{ fontFamily: 'Spectral, serif' }}>{program?.title || 'Program'}</CardTitle>
                      <CardDescription>Booked: {new Date(booking.booking_date).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600"><strong>Student:</strong> {booking.student_name}</p>
                        <p className="text-slate-600"><strong>Email:</strong> {booking.student_email}</p>
                        {booking.amount_paid && <p className="text-slate-600"><strong>Amount Paid:</strong> ${booking.amount_paid}</p>}
                        {booking.message && <p className="text-slate-600"><strong>Message:</strong> {booking.message}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

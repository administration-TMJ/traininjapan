import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SessionSelector from '@/components/SessionSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProgramDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    student_email: '',
    student_phone: '',
    message: ''
  });
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    fetchProgramDetails();
  }, [id]);

  const fetchProgramDetails = async () => {
    try {
      const programRes = await axios.get(`${API}/programs/${id}`);
      setProgram(programRes.data);
      
      const schoolRes = await axios.get(`${API}/schools/${programRes.data.school_id}`);
      setSchool(schoolRes.data);
    } catch (error) {
      console.error('Failed to fetch program details:', error);
      toast.error('Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to book a program');
      const authUrl = process.env.REACT_APP_AUTH_URL || 'https://auth.emergentagent.com';
      const redirectUrl = `${window.location.origin}/programs/${id}`;
      window.location.href = `${authUrl}/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    try {
      // Step 1: Create booking
      await axios.post(
        `${API}/programs/${id}/bookings`,
        formData,
        { withCredentials: true }
      );
      
      // Step 2: Initiate payment
      const originUrl = window.location.origin;
      const paymentResponse = await axios.post(
        `${API}/payments/checkout`,
        { course_id: id, origin_url: originUrl },
        { withCredentials: true }
      );
      
      // Step 3: Redirect to Stripe checkout
      if (paymentResponse.data.checkout_url) {
        window.location.href = paymentResponse.data.checkout_url;
      }
    } catch (error) {
      console.error('Booking/Payment failed:', error);
      const errorMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : error.response?.data?.message || error.message || 'Failed to process booking';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Program not found</h2>
          <Button onClick={() => navigate('/programs')}>Browse Programs</Button>
        </div>
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
            <button onClick={() => navigate('/programs')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">Programs</button>
            {user && (
              <Button onClick={() => navigate('/dashboard')} variant="default" className="bg-emerald-700 hover:bg-emerald-800">Dashboard</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Program Details */}
      <section data-testid="program-detail-section" className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Image */}
            <div>
              <img 
                src={program.image_url} 
                alt={program.title} 
                className="w-full h-96 object-cover rounded-2xl shadow-xl"
              />
            </div>

            {/* Info */}
            <div>
              <div className="mb-4">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">{program.category}</span>
              </div>
              
              {/* School Branding */}
              {school && (
                <Card className="mb-6 bg-gradient-to-r from-slate-50 to-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {school.logo_url ? (
                        <img 
                          src={school.logo_url} 
                          alt={school.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-200 flex items-center justify-center shadow-md">
                          <span className="text-emerald-900 font-bold text-2xl">
                            {school.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 uppercase tracking-wide">Offered by</p>
                        <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                          {school.name}
                        </h3>
                        {school.location && (
                          <p className="text-sm text-slate-600 mt-1">📍 {school.location}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <h1 data-testid="program-title" className="text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{program.title}</h1>
              <p data-testid="program-description" className="text-slate-600 mb-6 text-lg leading-relaxed">{program.description}</p>

              <Card className="mb-6">
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Duration:</span>
                    <span data-testid="program-duration" className="text-slate-900 font-semibold">{program.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Price:</span>
                    <span data-testid="program-price" className="text-slate-900 font-semibold">¥{program.price?.toLocaleString('ja-JP')}</span>
                  </div>
                  {program.start_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Start Date:</span>
                      <span data-testid="program-start-date" className="text-slate-900 font-semibold">{new Date(program.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {program.end_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">End Date:</span>
                      <span className="text-slate-900 font-semibold">{new Date(program.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {program.daily_start_time && program.daily_end_time && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">Daily Training:</span>
                      <span className="text-slate-900 font-semibold">{program.daily_start_time} - {program.daily_end_time}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* View Schedule Button */}
              {program.start_date && program.end_date && (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Training Schedule</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowSchedule(!showSchedule)}
                      >
                        {showSchedule ? 'Hide Schedule' : 'View Schedule'}
                      </Button>
                    </div>
                  </CardHeader>
                  {showSchedule && (
                    <CardContent>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-700">Program Duration:</span>
                          <span className="text-slate-900">
                            {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-700">Daily Training Hours:</span>
                          <span className="text-slate-900">
                            {program.daily_start_time || '09:00'} - {program.daily_end_time || '17:00'}
                          </span>
                        </div>
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-sm text-emerald-900">
                            <strong>Full-Time Intensive Training:</strong> This program runs every day during the specified dates. 
                            Students train full-time each day from {program.daily_start_time || '09:00'} to {program.daily_end_time || '17:00'}.
                          </p>
                          <p className="text-sm text-emerald-900 mt-2">
                            📧 Contact the school via email to request specific attendance dates after booking.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {program.requirements && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{program.requirements}</p>
                  </CardContent>
                </Card>
              )}

              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="book-now-btn" size="lg" className="w-full bg-emerald-700 hover:bg-emerald-800 text-lg py-6">
                    Book This Program
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Book Program</DialogTitle>
                    <DialogDescription>Fill in your details to submit a booking request</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBooking} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                      <input 
                        data-testid="booking-name-input"
                        type="text" 
                        required
                        value={formData.student_name}
                        onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <input 
                        data-testid="booking-email-input"
                        type="email" 
                        required
                        value={formData.student_email}
                        onChange={(e) => setFormData({...formData, student_email: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input 
                        data-testid="booking-phone-input"
                        type="tel" 
                        value={formData.student_phone}
                        onChange={(e) => setFormData({...formData, student_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                      <textarea 
                        data-testid="booking-message-input"
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      ></textarea>
                    </div>
                    <Button data-testid="booking-submit-btn" type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">Submit Booking</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* School Info */}
          {school && (
            <Card className="mt-12">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Spectral, serif' }}>About the School</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{school.name}</h3>
                <p className="text-slate-600 mb-4">{school.description}</p>
                
                {/* Learn More About School Link */}
                {school.bio && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mb-4 border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                        📖 Learn More About This School
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{school.name}</DialogTitle>
                        <DialogDescription>{school.tagline || 'Training School'}</DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{school.bio}</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600"><strong>Location:</strong> {school.location}</p>
                  <p className="text-slate-600"><strong>Contact:</strong> {school.contact_email}</p>
                  {school.website && <p className="text-slate-600"><strong>Website:</strong> <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">{school.website}</a></p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProgramDetail;

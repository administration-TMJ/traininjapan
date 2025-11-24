import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SchoolRegistration = () => {
  const { user, checkAuth, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    school_name: '',
    description: '',
    location: '',
    contact_phone: '',
    website: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Use the combined school-signup endpoint
      const response = await axios.post(`${API}/auth/school-signup`, {
        user_name: formData.user_name,
        email: formData.email,
        password: formData.password,
        school_name: formData.school_name,
        description: formData.description,
        location: formData.location,
        contact_phone: formData.contact_phone,
        website: formData.website
      }, { withCredentials: true });
      
      // Set user from response
      const userData = response.data.user;
      setUser(userData);
      
      toast.success('School account created successfully! Redirecting to your dashboard...');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('School registration failed:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to register school';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = () => {
    const authUrl = process.env.REACT_APP_AUTH_URL || 'https://auth.emergentagent.com';
    const redirectUrl = `${window.location.origin}/register-school`;
    window.location.href = `${authUrl}/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" onClick={() => navigate('/')} className="text-2xl font-bold text-slate-900 cursor-pointer" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">Home</button>
            <button onClick={() => navigate('/programs')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">Programs</button>
            {user ? (
              <Button onClick={() => navigate('/dashboard')} variant="default" className="bg-emerald-700 hover:bg-emerald-800">Dashboard</Button>
            ) : (
              <Button data-testid="login-btn" onClick={handleLogin} variant="default" className="bg-emerald-700 hover:bg-emerald-800">Sign In</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Registration Form */}
      <section data-testid="school-registration-section" className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Register Your School</h1>
            <p className="text-lg text-slate-600">Join our platform and share your authentic Japanese martial arts or cultural programs with students worldwide.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Spectral, serif' }}>School Information</CardTitle>
              <CardDescription>
                Fill in your school details and get immediate access. You can add locations, instructors, and courses right away. 
                <strong className="text-emerald-700"> Note: Your first course will need admin approval before it's published.</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Information Section */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-4">Account Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Your Full Name *</label>
                      <input 
                        data-testid="user-name-input"
                        type="text" 
                        required
                        value={formData.user_name}
                        onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                      <input 
                        data-testid="user-email-input"
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                        <input 
                          data-testid="user-password-input"
                          type="password" 
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                          placeholder="At least 6 characters"
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password *</label>
                        <input 
                          data-testid="user-confirm-password-input"
                          type="password" 
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Information Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">School Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">School Name *</label>
                      <input 
                        data-testid="school-name-input"
                        type="text" 
                        required
                        value={formData.school_name}
                        onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="e.g., Tokyo Aikido Dojo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                      <textarea 
                        data-testid="school-description-input"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="Tell us about your school, teaching style, and philosophy..."
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Location (City, Prefecture) *</label>
                      <input 
                        data-testid="school-location-input"
                        type="text" 
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="e.g., Tokyo, Japan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone</label>
                      <input 
                        data-testid="school-phone-input"
                        type="tel" 
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="+81-XXX-XXXX-XXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                      <input 
                        data-testid="school-website-input"
                        type="url" 
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        placeholder="https://yourschool.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-950">
                    <strong>✓ Instant Access:</strong> Your account and school will be created immediately. You can start adding locations, instructors, and programs right away. Your first course will need admin approval before going live.
                  </p>
                </div>

                <Button 
                  data-testid="school-submit-btn"
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 py-6 text-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SchoolRegistration;

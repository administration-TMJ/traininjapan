import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PriceDisplay from '@/components/PriceDisplay';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrowsePrograms = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedLevel, searchQuery, maxPrice, programs]);

  const applyFilters = () => {
    let filtered = programs;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Experience level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(p => p.experience_level === selectedLevel);
    }

    // Search query (title, description, martial_arts_style)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.martial_arts_style.toLowerCase().includes(query)
      );
    }

    // Max price filter
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
    }

    setFilteredPrograms(filtered);
  };

  const fetchPrograms = async () => {
    try {
      const response = await axios.get(`${API}/programs`);
      setPrograms(response.data);
      setFilteredPrograms(response.data);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'Martial Arts', 'Cultural Arts', 'Sword Arts', 'Archery', 'Meditation'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" onClick={() => navigate('/')} className="text-2xl font-bold text-slate-900 cursor-pointer" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">Home</button>
            {user && (
              <Button data-testid="nav-dashboard-btn" onClick={() => navigate('/dashboard')} variant="default" className="bg-emerald-700 hover:bg-emerald-800">Dashboard</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 px-6 bg-gradient-to-r from-emerald-700 to-emerald-800">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Browse Programs</h1>
          <p className="text-emerald-100 text-lg">Discover authentic Japanese martial arts and cultural training programs</p>
        </div>
      </section>

      {/* Filters */}
      <section data-testid="programs-section" className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Filter Programs</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <input
                  data-testid="search-input"
                  type="text"
                  placeholder="Search programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="category-filter" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Experience Level</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger data-testid="level-filter" className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Price (AUD)</label>
                <input
                  data-testid="price-filter"
                  type="number"
                  placeholder="Any price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-600">
              Showing {filteredPrograms.length} of {programs.length} programs
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div data-testid="no-programs" className="text-center py-20">
              <p className="text-slate-600 text-lg">No programs available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPrograms.map((program, idx) => (
                <Card key={program.id} data-testid={`program-card-${idx}`} className="overflow-hidden hover:shadow-xl transition-shadow">
                  <img src={program.image_url} alt={program.title} className="w-full h-48 object-cover" />
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">{program.category}</span>
                    </div>
                    
                    {/* School Branding */}
                    {program.school && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                        {program.school.logo_url ? (
                          <img 
                            src={program.school.logo_url} 
                            alt={program.school.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-semibold text-sm">
                              {program.school.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{program.school.name}</p>
                          <p className="text-xs text-slate-500">Training School</p>
                        </div>
                      </div>
                    )}
                    
                    <CardTitle className="text-xl" style={{ fontFamily: 'Spectral, serif' }}>{program.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-600"><strong>Duration:</strong> {program.duration}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-slate-600 font-semibold">Price:</span>
                        <PriceDisplay price={program.price} currency={program.currency} size="md" />
                      </div>
                      {program.start_date && <p className="text-slate-600"><strong>Starts:</strong> {program.start_date}</p>}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      data-testid={`view-program-${idx}`}
                      onClick={() => navigate(`/programs/${program.id}`)} 
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BrowsePrograms;

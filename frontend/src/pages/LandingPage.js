import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthModal from '@/components/AuthModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const LandingPage = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const getMartialArts = () => [
    {
      titleKey: 'martialArts.asayama.title',
      descriptionKey: 'martialArts.asayama.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_5703.JPG'
    },
    {
      titleKey: 'martialArts.kyudo.title',
      descriptionKey: 'martialArts.kyudo.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/468449155_10161447120048692_3053896351382417673_n%20-%20Copy.jpg'
    },
    {
      titleKey: 'martialArts.karate.title',
      descriptionKey: 'martialArts.karate.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_5695.JPG'
    },
    {
      titleKey: 'martialArts.aikido.title',
      descriptionKey: 'martialArts.aikido.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_5693.JPG'
    },
    {
      titleKey: 'martialArts.iaido.title',
      descriptionKey: 'martialArts.iaido.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_5690.JPG'
    },
    {
      titleKey: 'martialArts.aikijujutsu.title',
      descriptionKey: 'martialArts.aikijujutsu.description',
      image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_5703.JPG'
    }
  ];

  const getCulturalArts = () => [
    { titleKey: 'culturalArts.calligraphy', image: 'https://images.unsplash.com/photo-1486303954368-398fea0e72cd?q=80&w=2940' },
    { titleKey: 'culturalArts.ikebana', image: 'https://images.unsplash.com/photo-1564868405024-af2aa9752aac?q=80&w=2940' },
    { titleKey: 'culturalArts.sumie', image: 'https://images.unsplash.com/photo-1546638008-efbe0b62c730?q=80&w=2940' },
    { titleKey: 'culturalArts.swordSmithing', image: 'https://raw.githubusercontent.com/administration-TMJ/images/main/10620355_10152547227283692_1873362983066131198_o_10152547227283692.jpg' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 data-testid="site-logo" className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Playfair Display, serif' }}>Train In Japan</h1>
          <div className="flex items-center gap-6">
            <button data-testid="nav-programs" onClick={() => navigate('/programs')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">{t('nav.programs')}</button>
            <button data-testid="nav-schools" onClick={() => navigate('/register-school')} className="text-slate-700 hover:text-emerald-800 font-medium transition-colors">{t('nav.forSchools')}</button>
            {user ? (
              <Button data-testid="nav-dashboard-btn" onClick={() => navigate('/dashboard')} variant="default" className="bg-emerald-700 hover:bg-emerald-800">{t('nav.dashboard')}</Button>
            ) : (
              <Button data-testid="nav-login-btn" onClick={() => setAuthModalOpen(true)} variant="default" className="bg-emerald-700 hover:bg-emerald-800">{t('nav.signIn')}</Button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section data-testid="hero-section" className="relative pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div data-testid="hero-content">
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                {t('hero.title')}
              </h1>
              <p className="text-lg text-slate-600 mb-8" style={{ fontFamily: 'Spectral, serif' }}>
                {t('hero.subtitle')}
              </p>
              <div className="flex gap-4">
                <Button data-testid="hero-explore-btn" onClick={() => navigate('/programs')} size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white px-8">
                  {t('hero.explorePrograms')}
                </Button>
                <Button data-testid="hero-contact-btn" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} size="lg" variant="outline" className="border-slate-300 hover:bg-slate-100">
                  {t('hero.contactUs')}
                </Button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://raw.githubusercontent.com/administration-TMJ/images/main/IMG_6095.JPG"
                alt="Traditional Japanese dojo - Train in Japan"
                className="rounded-2xl shadow-2xl w-full h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Discover Section */}
      <section data-testid="discover-section" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{t('sections.discoverTheArt')}</h2>
          <p className="text-center text-slate-600 max-w-3xl mx-auto mb-16">
            {t('sections.discoverIntro')}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { titleKey: 'sections.authenticTraining', descKey: 'sections.authenticTrainingDesc' },
              { titleKey: 'sections.culturalImmersion', descKey: 'sections.culturalImmersionDesc' },
              { titleKey: 'sections.allLevelsWelcome', descKey: 'sections.allLevelsWelcomeDesc' }
            ].map((item, idx) => (
              <Card key={idx} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Spectral, serif' }}>{t(item.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{t(item.descKey)}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Martial Arts Section */}
      <section data-testid="martial-arts-section" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{t('sections.availableForBookings')}</h2>
          <p className="text-center text-slate-600 max-w-3xl mx-auto mb-16">
            {t('sections.availableForBookingsDesc')}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getMartialArts().map((art, idx) => (
              <div key={idx} data-testid={`martial-art-${idx}`} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300">
                <img src={art.image} alt={t(art.titleKey)} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Spectral, serif' }}>{t(art.titleKey)}</h3>
                  <p className="text-slate-200 text-sm">{t(art.descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cultural Arts Section */}
      <section data-testid="cultural-arts-section" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16" style={{ fontFamily: 'Playfair Display, serif' }}>{t('sections.culturalArtsTitle')}</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getCulturalArts().map((art, idx) => (
              <div key={idx} data-testid={`cultural-art-${idx}`} className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow group">
                <img src={art.image} alt={t(art.titleKey)} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent flex items-end p-4">
                  <h3 className="text-white font-semibold">{t(art.titleKey)}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-emerald-700 to-emerald-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>{t('cta.title')}</h2>
          <p className="text-emerald-100 text-lg mb-8">{t('cta.subtitle')}</p>
          <Button data-testid="cta-browse-btn" onClick={() => navigate('/programs')} size="lg" variant="secondary" className="bg-white text-emerald-800 hover:bg-emerald-50">
            {t('cta.button')}
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" data-testid="contact-section" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-12" style={{ fontFamily: 'Playfair Display, serif' }}>{t('contact.title')}</h2>
          
          <Card>
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('contact.firstName')} *</label>
                    <input data-testid="contact-firstname" type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t('contact.lastName')}</label>
                    <input data-testid="contact-lastname" type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('contact.email')} *</label>
                  <input data-testid="contact-email" type="email" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('contact.phone')}</label>
                  <input data-testid="contact-phone" type="tel" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('contact.message')} *</label>
                  <textarea data-testid="contact-message" rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"></textarea>
                </div>
                <Button data-testid="contact-submit-btn" type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">{t('contact.submit')}</Button>
              </form>
              <div className="mt-8 text-center">
                <p className="text-slate-600">{t('contact.emailLabel')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{t('footer.title')}</h3>
          <p className="text-slate-400">{t('footer.subtitle')}</p>
          <p className="text-slate-500 mt-8 text-sm">{t('footer.copyright')}</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </div>
  );
};

export default LandingPage;

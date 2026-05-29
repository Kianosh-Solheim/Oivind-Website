import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Foto from './pages/Foto';
import Refleksjoner from './pages/Refleksjoner';
import RefleksjonView from './pages/RefleksjonView';
import Romanar from './pages/Romanar';
import Admin from './pages/Admin';
import Dagbok from './pages/Dagbok';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/foto" element={<Foto />} />
              <Route path="/refleksjonar" element={<Refleksjoner />} />
              <Route path="/refleksjonar/:slug" element={<RefleksjonView />} />
              <Route path="/dagbok" element={<Dagbok />} />
              <Route path="/boker" element={<Romanar />} />
              <Route path="/admin" element={<Admin />} />
              {/* Redirect old English routes to the standard ones */}
              <Route path="/English" element={<Navigate to="/refleksjonar" replace />} />
              <Route path="/English/:slug" element={<Navigate to="/refleksjonar/:slug" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </LanguageProvider>
  );
}

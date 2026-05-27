import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Foto from './pages/Foto';
import Refleksjoner from './pages/Refleksjoner';
import RefleksjonView from './pages/RefleksjonView';
import Romanar from './pages/Romanar';
import Admin from './pages/Admin';
import EnglishArticles from './pages/EnglishArticles';
import EnglishArticleView from './pages/EnglishArticleView';

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/foto" element={<Foto />} />
            <Route path="/refleksjonar" element={<Refleksjoner />} />
            <Route path="/refleksjonar/:slug" element={<RefleksjonView />} />
            <Route path="/romanar" element={<Romanar />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/English" element={<EnglishArticles />} />
            <Route path="/English/:slug" element={<EnglishArticleView />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

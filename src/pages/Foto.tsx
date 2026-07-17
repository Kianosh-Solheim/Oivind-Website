import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface GalleryPhoto {
  id?: string;
  src: string;
  alt: string;
  className?: string;
}

export default function Foto() {
  const [dbImages, setDbImages] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadGallery() {
      try {
        const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setDbImages(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GalleryPhoto)));
      } catch (err) {
        console.error("Feil ved henting av galleribilde:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, []);

  const staticImages: GalleryPhoto[] = [
    {
      src: "https://images.unsplash.com/photo-1439853949703-ff2200f56f34?q=80&w=2000&auto=format&fit=crop",
      alt: "Skodde over vatnet og fjellkjeda",
    },
    {
      src: "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1000&auto=format&fit=crop",
      alt: "Grøn mose og små detaljar i skogbotnen",
    },
    {
      src: "https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=1000&auto=format&fit=crop",
      alt: "Ein stille dal omkransa av majestetiske fjell",
    },
    {
      src: "https://images.unsplash.com/photo-1470071372847-512030d944e5?q=80&w=1000&auto=format&fit=crop",
      alt: "Furuskog badande i mjukt morgonlys",
    },
    {
      src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1000&auto=format&fit=crop",
      alt: "Ein turgåar som skodes utover vidda",
    },
    {
      src: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=1000&auto=format&fit=crop",
      alt: "Ein mystisk sti djupt inne i skogen",
    },
    {
      src: "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?q=80&w=1000&auto=format&fit=crop",
      alt: "Stjernehimmel over mørke tre",
    },
  ];

  const images = dbImages.length > 0 ? dbImages : staticImages;

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImageIndex === null) return;
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, images]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="bg-brand-surface min-h-screen">
      {/* PAGE HEADER */}
      <section className="py-20 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase mb-12">
          <ArrowLeft className="mr-2 w-4 h-4" /> TILBAKE TIL HEIM
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-6">
          Foto & Natur
        </h1>
        <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
        <p className="text-lg md:text-xl text-brand-dark/80 font-sans leading-relaxed">
          Naturen er ikkje ein stad vi besøkjer. Det er heimen vår.<br className="hidden md:block" /> 
          Gjennom linsa prøver eg å fange dei stille augneblinkane, lyset som forandrar alt, og detaljane vi ofte hastar forbi.
        </p>
      </section>

      {/* GALLERY SECTION (Masonry/Photo Wall) */}
      <section className="px-6 md:px-12 lg:px-24 pb-32 max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 space-y-4 md:space-y-6 [column-fill:balance]">
            {images.map((image, index) => (
              <div 
                key={image.id || index} 
                onClick={() => setActiveImageIndex(index)}
                className="break-inside-avoid block overflow-hidden group cursor-pointer relative bg-brand-sand shadow-sm hover:shadow-lg transition-all duration-300 rounded-sm"
              >
                <img 
                  loading="lazy"
                  src={image.src} 
                  alt={image.alt} 
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-6 opacity-0 group-hover:opacity-100">
                  <p className="text-white font-sans text-sm tracking-wide font-medium line-clamp-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    {image.alt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* LIGHTBOX / FULLSCREEN MODAL */}
      <AnimatePresence>
        {activeImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImageIndex(null)}
            className="fixed inset-0 bg-black/95 z-[500] flex flex-col justify-between p-4 md:p-8"
          >
            {/* Header/Close */}
            <div className="flex justify-end items-center text-white/70 hover:text-white transition-colors z-[510]">
              <button 
                onClick={() => setActiveImageIndex(null)}
                className="p-3 bg-black/40 hover:bg-black/80 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Lukk biletvisar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main content with image and navigation arrows */}
            <div className="relative flex-1 flex items-center justify-center max-w-7xl mx-auto w-full group/lightbox">
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-2 md:left-4 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/80 hover:text-white transition-all transform hover:scale-105 z-[510] flex items-center justify-center cursor-pointer"
                aria-label="Førre bilde"
              >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
              </button>

              {/* Image with subtle fade-in */}
              <motion.div
                key={activeImageIndex}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="max-h-[80vh] max-w-full flex items-center justify-center p-2 relative select-none"
              >
                <img 
                  src={images[activeImageIndex].src} 
                  alt={images[activeImageIndex].alt} 
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] max-w-[90vw] md:max-w-[75vw] object-contain shadow-2xl border border-white/5 bg-neutral-900"
                  onClick={(e) => e.stopPropagation()} // Prevent clicking the image from closing the lightbox
                />
              </motion.div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-2 md:right-4 p-3 rounded-full bg-black/20 hover:bg-black/60 text-white/80 hover:text-white transition-all transform hover:scale-105 z-[510] flex items-center justify-center cursor-pointer"
                aria-label="Neste bilde"
              >
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>

            {/* Footer containing caption & image numbering */}
            <div className="text-center text-white/80 max-w-2xl mx-auto pb-4 z-[510]">
              <p className="font-sans text-sm md:text-base font-medium tracking-wide mb-1 select-none">
                {images[activeImageIndex].alt}
              </p>
              <span className="font-mono text-[11px] text-white/50 tracking-widest uppercase">
                Bilde {activeImageIndex + 1} av {images.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* QUOTE SECTION */}
      <section className="py-24 px-6 md:px-12 text-center bg-brand-light flex flex-col items-center justify-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-2xl md:text-3xl font-serif italic text-brand-dark leading-snug">
            "Å sjå er meir enn å bruke auga. Det handlar om å vere til stades."
          </p>
        </div>
      </section>
    </div>
  );
}


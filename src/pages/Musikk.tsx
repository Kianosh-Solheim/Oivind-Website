import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Play,
  Pause,
  Music,
  Plus,
  FileText,
  Volume2,
  Download,
  X,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { fetchAllSongs, formatDuration } from '../lib/songService';
import { slugify } from '../lib/utils';
import { Song } from '../types';

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' · ')
    .replace(/<\/p>/gi, ' · ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Musikk() {
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const { currentSong, isPlaying, isBuffering, playSong, downloadSong } = useMusicPlayer();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'no' | 'en'>('all');

  useEffect(() => {
    let isMounted = true;
    const loadSongs = async () => {
      setLoading(true);
      try {
        const list = await fetchAllSongs(isAdmin);
        if (isMounted) {
          setSongs(list);
        }
      } catch (err) {
        console.error('Error loading songs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadSongs();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // Available genres extracted from songs
  const genres = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => {
      if (s.genre && s.genre.trim()) {
        set.add(s.genre.trim());
      }
    });
    return Array.from(set);
  }, [songs]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // Visibility check for non-admins
      if (!isAdmin && song.published === false) return false;

      // Language filter
      if (langFilter !== 'all') {
        const songLang = song.language || 'no';
        if (songLang !== 'both' && songLang !== langFilter) return false;
      }

      // Genre filter
      if (selectedGenre !== 'all') {
        if ((song.genre || '').trim().toLowerCase() !== selectedGenre.toLowerCase()) {
          return false;
        }
      }

      // Search query filter (title, lyrics, description, genre)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (song.title || '').toLowerCase().includes(q);
        const inLyrics = stripHtml(song.lyrics || '').toLowerCase().includes(q);
        const inDesc = (song.description || '').toLowerCase().includes(q);
        const inGenre = (song.genre || '').toLowerCase().includes(q);
        if (!inTitle && !inLyrics && !inDesc && !inGenre) return false;
      }

      return true;
    });
  }, [songs, isAdmin, langFilter, selectedGenre, searchQuery]);

  const playableFilteredSongs = useMemo(
    () => filteredSongs.filter((s) => Boolean(s.audioUrl)),
    [filteredSongs]
  );

  const handlePlayAll = () => {
    if (playableFilteredSongs.length > 0) {
      playSong(playableFilteredSongs[0], playableFilteredSongs);
    }
  };

  return (
    <div className="bg-brand-surface min-h-screen pb-32">
      {/* Header Section */}
      <section className="pt-20 pb-12 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto border-b border-brand-sand">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-3xl">
            <span className="text-xs font-sans tracking-[0.25em] font-semibold uppercase text-brand-accent block mb-4">
              {language === 'en' ? 'SONGS & LYRICS ARCHIVE' : 'MUSIKK & SONGTEKSTAR'}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-brand-dark leading-tight mb-5">
              {language === 'en' ? 'Music that touches the soul' : 'Songar, tekstar og tonar'}
            </h1>
            <p className="text-base md:text-lg text-brand-dark/75 font-sans leading-relaxed max-w-2xl">
              {language === 'en'
                ? 'Explore songs, melodies, and lyrics springing from life, nature, and the time we live in. Listen directly in the browser or open each song to read the full lyrics.'
                : 'Utforsk songar, melodiar og tekstar som spring ut frå livet, naturen og tida vi lever i. Lytt direkte på nettsida eller opne kvar enkelt song for å lese heile songteksten.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {playableFilteredSongs.length > 0 && (
              <button
                type="button"
                onClick={handlePlayAll}
                className="inline-flex items-center gap-2.5 bg-brand-accent hover:bg-[#b58952] text-brand-dark font-sans text-xs font-semibold tracking-widest uppercase px-6 py-3.5 transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'en' ? 'Play All Songs' : 'Spel av alle'}</span>
              </button>
            )}

            {isAdmin && (
              <Link
                to="/admin?compose_song=true"
                className="inline-flex items-center gap-2 bg-brand-dark hover:bg-black text-white font-sans text-xs font-semibold tracking-widest uppercase px-6 py-3.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'en' ? 'New Song' : 'Ny song'}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-10 pt-8 border-t border-brand-sand/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Search by song title, lyrics, or genre...'
                  : 'Søk etter songtittel, tekstlinjer eller sjanger...'
              }
              className="w-full bg-white border border-brand-sand pl-11 pr-10 py-3 text-sm font-sans text-brand-dark placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-dark transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-dark p-1"
                title={language === 'en' ? 'Clear search' : 'Tøm søk'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Genre & Language Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 bg-brand-sand/60 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedGenre('all')}
                  className={`px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase transition-colors ${
                    selectedGenre === 'all'
                      ? 'bg-brand-dark text-white'
                      : 'text-brand-dark/75 hover:text-brand-dark'
                  }`}
                >
                  {language === 'en' ? 'All Genres' : 'Alle sjangrar'}
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase transition-colors ${
                      selectedGenre === genre
                        ? 'bg-brand-dark text-white'
                        : 'text-brand-dark/75 hover:text-brand-dark'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 bg-brand-sand/60 p-1">
              <button
                type="button"
                onClick={() => setLangFilter('all')}
                className={`px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase transition-colors ${
                  langFilter === 'all'
                    ? 'bg-brand-dark text-white'
                    : 'text-brand-dark/75 hover:text-brand-dark'
                }`}
              >
                {language === 'en' ? 'All' : 'Alle'}
              </button>
              <button
                type="button"
                onClick={() => setLangFilter('no')}
                className={`px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase transition-colors ${
                  langFilter === 'no'
                    ? 'bg-brand-dark text-white'
                    : 'text-brand-dark/75 hover:text-brand-dark'
                }`}
              >
                Norsk
              </button>
              <button
                type="button"
                onClick={() => setLangFilter('en')}
                className={`px-3 py-1.5 text-xs font-sans font-semibold tracking-wider uppercase transition-colors ${
                  langFilter === 'en'
                    ? 'bg-brand-dark text-white'
                    : 'text-brand-dark/75 hover:text-brand-dark'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Song Grid */}
      <section className="py-16 px-6 md:px-12 lg:px-24 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white border border-brand-sand p-5 animate-pulse">
                <div className="aspect-square bg-brand-sand/50 mb-5" />
                <div className="h-4 bg-brand-sand/60 w-1/3 mb-3" />
                <div className="h-7 bg-brand-sand/70 w-3/4 mb-3" />
                <div className="h-4 bg-brand-sand/40 w-full" />
              </div>
            ))}
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="bg-white border border-brand-sand p-12 md:p-20 text-center max-w-2xl mx-auto">
            <Music className="w-10 h-10 text-brand-accent mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-serif text-brand-dark mb-3">
              {searchQuery || selectedGenre !== 'all' || langFilter !== 'all'
                ? language === 'en'
                  ? 'No songs matched your search'
                  : 'Ingen songar passa med søket ditt'
                : language === 'en'
                ? 'No songs published yet'
                : 'Ingen songar er publiserte enno'}
            </h2>
            <p className="text-sm text-brand-muted font-sans max-w-md mx-auto mb-8 leading-relaxed">
              {searchQuery || selectedGenre !== 'all' || langFilter !== 'all'
                ? language === 'en'
                  ? 'Try adjusting your search query or clearing the genre filter.'
                  : 'Prøv eit anna søkjeord eller tilbakestill filteret for å sjå alle songane.'
                : language === 'en'
                ? 'Songs and lyrics will appear here once published.'
                : 'Her kjem songar, lydspor og songtekstar så snart dei er publiserte.'}
            </p>
            {(searchQuery || selectedGenre !== 'all' || langFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('all');
                  setLangFilter('all');
                }}
                className="inline-flex items-center gap-2 bg-brand-dark text-white text-xs font-sans font-semibold tracking-widest uppercase px-6 py-3 hover:bg-black transition-colors"
              >
                {language === 'en' ? 'Show All Songs' : 'Vis alle songar'}
              </button>
            )}
            {isAdmin && songs.length === 0 && (
              <Link
                to="/admin?compose_song=true"
                className="inline-flex items-center gap-2 bg-brand-dark text-white text-xs font-sans font-semibold tracking-widest uppercase px-6 py-3.5 hover:bg-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'en' ? 'Publish First Song' : 'Publiser første song'}</span>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 text-xs font-sans text-brand-muted">
              <span>
                {language === 'en'
                  ? `Showing ${filteredSongs.length} ${filteredSongs.length === 1 ? 'song' : 'songs'}`
                  : `Viser ${filteredSongs.length} ${filteredSongs.length === 1 ? 'song' : 'songar'}`}
              </span>
              {isAdmin && (
                <Link
                  to="/admin?tab=music"
                  className="text-brand-dark hover:text-brand-accent font-semibold tracking-widest uppercase transition-colors"
                >
                  {language === 'en' ? 'Manage Music in Admin →' : 'Administrer musikk i kontrollpanel →'}
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSongs.map((song, idx) => {
                const songUrl = `/musikk/${song.slug || song.id || slugify(song.title)}`;
                const isThisSongCurrent = currentSong?.id === song.id;
                const isThisSongPlaying = isThisSongCurrent && isPlaying;
                const lyricsExcerpt = song.description || stripHtml(song.lyrics);

                return (
                  <motion.article
                    key={song.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: Math.min(idx * 0.05, 0.3) }}
                    className={`group bg-white border transition-all duration-300 flex flex-col justify-between ${
                      isThisSongCurrent
                        ? 'border-brand-accent shadow-lg ring-1 ring-brand-accent/30'
                        : 'border-brand-sand hover:border-brand-dark/30 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Square Cover Image + Play Button */}
                      <div className="relative aspect-square w-full bg-[#1C1917] overflow-hidden">
                        <Link to={songUrl} className="block w-full h-full">
                          {song.coverImageUrl ? (
                            <img
                              loading="lazy"
                              src={song.coverImageUrl}
                              alt={song.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#231F1C] via-[#181512] to-[#12100E] relative">
                              {/* Subtle vinyl groove circles */}
                              <div className="w-44 h-44 rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-28 h-28 rounded-full border border-white/10 flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
                                    <Music className="w-5 h-5 text-brand-accent" />
                                  </div>
                                </div>
                              </div>
                              <span className="mt-5 font-serif italic text-stone-300 text-sm line-clamp-1 px-4">
                                {song.title}
                              </span>
                            </div>
                          )}
                        </Link>

                        {/* Play/Pause Floating Button when audio exists */}
                        {song.audioUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              playSong(song, playableFilteredSongs);
                            }}
                            aria-label={isThisSongPlaying ? 'Pause' : 'Spel av'}
                            className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                              isThisSongPlaying
                                ? 'bg-brand-accent text-brand-dark scale-105'
                                : 'bg-brand-dark/90 text-white hover:bg-brand-accent hover:text-brand-dark hover:scale-105'
                            }`}
                          >
                            {isThisSongCurrent && isBuffering ? (
                              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isThisSongPlaying ? (
                              <Pause className="w-5 h-5 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            )}
                          </button>
                        )}

                        {/* Active Playing Indicator */}
                        {isThisSongPlaying && (
                          <div className="absolute top-4 left-4 bg-brand-dark/90 backdrop-blur-sm text-brand-accent px-3 py-1 text-[11px] font-sans font-semibold tracking-widest uppercase flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                            <span>{language === 'en' ? 'Playing' : 'Spelar no'}</span>
                          </div>
                        )}
                      </div>

                      {/* Song Metadata & Title */}
                      <div className="p-6 pb-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-brand-muted mb-2.5">
                          {song.genre && <span>{song.genre}</span>}
                          {song.genre && song.releaseYear && <span aria-hidden="true">·</span>}
                          {song.releaseYear && <span className="font-mono tabular-nums">{song.releaseYear}</span>}
                          {(song.genre || song.releaseYear) && song.durationSeconds ? (
                            <span aria-hidden="true">·</span>
                          ) : null}
                          {song.durationSeconds ? (
                            <span className="font-mono tabular-nums">{formatDuration(song.durationSeconds)}</span>
                          ) : null}
                          {!song.published && isAdmin && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-700 font-semibold uppercase tracking-wider">
                                {language === 'en' ? 'Draft' : 'Utkast'}
                              </span>
                            </>
                          )}
                        </div>

                        <Link to={songUrl} className="block group-hover:text-brand-accent transition-colors">
                          <h2 className="text-2xl font-serif text-brand-dark leading-snug mb-2.5">
                            {song.title}
                          </h2>
                        </Link>

                        {lyricsExcerpt && (
                          <p className="text-sm text-brand-dark/70 font-serif italic line-clamp-2 leading-relaxed">
                            {lyricsExcerpt}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-6 py-4 border-t border-brand-sand/60 flex items-center justify-between gap-3">
                      <Link
                        to={songUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-widest uppercase text-brand-dark hover:text-brand-accent transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Lyrics & Song' : 'Songtekst'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <div className="flex items-center gap-3">
                        {song.allowDownload && song.audioUrl && (
                          <button
                            type="button"
                            onClick={() => downloadSong(song)}
                            className="text-brand-muted hover:text-brand-dark transition-colors p-1"
                            title={language === 'en' ? 'Download audio' : 'Last ned lydfil'}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {isAdmin && song.id && (
                          <Link
                            to={`/admin?edit_song=${song.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold tracking-widest uppercase text-brand-muted hover:text-brand-dark transition-colors"
                            title="Rediger song"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Endre</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

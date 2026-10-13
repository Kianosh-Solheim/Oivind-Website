import { useState, useEffect, useRef, memo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Music,
  MessageSquarePlus,
  Edit3,
  Share2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { isHtml, slugify } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import {
  fetchSongBySlugOrId,
  fetchAllSongs,
  formatDuration
} from '../lib/songService';
import Comments, { Comment } from '../components/Comments';
import { Song } from '../types';

const LyricsContent = memo(({ content }: { content: string }) => {
  if (!content) {
    return (
      <p className="text-brand-muted italic font-serif">
        Ingen songtekst lagt inn for denne songen enno.
      </p>
    );
  }
  if (isHtml(content)) {
    return (
      <div
        className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <div className="prose prose-brand max-w-none text-brand-dark/90 font-serif leading-relaxed text-lg whitespace-pre-wrap">
      {content}
    </div>
  );
});

export default function SongView() {
  const { slug } = useParams();
  const { language, setLanguage } = useLanguage();
  const { isAdmin } = useAuth();
  const {
    currentSong,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    playerError,
    playSong,
    seek,
    setVolume,
    toggleMute,
    downloadSong
  } = useMusicPlayer();

  const [song, setSong] = useState<Song | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [translationSlug, setTranslationSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Text selection & margin comments state
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeQuote, setActiveQuote] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [focusedCommentId, setFocusedCommentId] = useState<string | undefined>(undefined);
  const [quotePositions, setQuotePositions] = useState<{ commentId: string; top: number; quote: string }[]>([]);
  const [activeMarginCommentId, setActiveMarginCommentId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSongData = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const [foundSong, songsList] = await Promise.all([
          fetchSongBySlugOrId(slug, isAdmin),
          fetchAllSongs(isAdmin)
        ]);

        if (!isMounted) return;
        setSong(foundSong);
        setAllSongs(songsList);

        if (foundSong?.id) {
          fetchComments(foundSong.id);
        }

        if (foundSong?.translationId) {
          const transSong = await fetchSongBySlugOrId(foundSong.translationId, isAdmin);
          if (transSong && (transSong.published !== false || isAdmin)) {
            setTranslationSlug(transSong.slug || transSong.id || null);
          } else {
            setTranslationSlug(null);
          }
        } else {
          setTranslationSlug(null);
        }
      } catch (err) {
        console.error('Error loading song view:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSongData();
    return () => {
      isMounted = false;
    };
  }, [slug, isAdmin]);

  const fetchComments = async (songId: string) => {
    setCommentsLoading(true);
    try {
      const q = query(collection(db, 'comments'), where('articleId', '==', songId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
      fetched.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setComments(fetched);
    } catch (err) {
      console.error('Error fetching song comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const docRef = await addDoc(collection(db, 'comments'), {
      ...comment,
      createdAt: serverTimestamp()
    });
    setComments((prev) => [
      {
        id: docRef.id,
        ...comment,
        createdAt: { toMillis: () => Date.now() }
      } as unknown as Comment,
      ...prev
    ]);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { doc: fsDoc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(fsDoc(db, 'comments', commentId));
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // Text selection for quoting lyrics lines
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !contentRef.current?.contains(selection.anchorNode)) {
          setSelectionPosition((prev) => {
            if (prev) {
              setSelectedText('');
              return null;
            }
            return prev;
          });
          return;
        }
        const text = selection.toString().trim();
        if (text.length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionPosition({
            top: rect.top + window.scrollY - 40,
            left: rect.left + rect.width / 2
          });
          setSelectedText(text);
        }
      }, 200);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Margin quote positions
  useEffect(() => {
    if (!contentRef.current || comments.length === 0) return;
    const newPositions: { commentId: string; top: number; quote: string }[] = [];
    const el = contentRef.current;

    comments.forEach((comment) => {
      if (comment.quote) {
        const searchStr = comment.quote.substring(0, 15).trim();
        if (searchStr.length < 3) return;
        const finder = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        let foundTop = -1;
        while ((node = finder.nextNode())) {
          if (node.nodeValue?.includes(searchStr)) {
            const range = document.createRange();
            const idx = node.nodeValue.indexOf(searchStr);
            range.setStart(node, idx);
            range.setEnd(node, idx + searchStr.length);
            const rect = range.getBoundingClientRect();
            foundTop = rect.top + window.scrollY;
            break;
          }
        }
        if (foundTop > 0) {
          const containerRect = el.getBoundingClientRect();
          newPositions.push({
            commentId: comment.id,
            top: foundTop - (containerRect.top + window.scrollY),
            quote: comment.quote
          });
        }
      }
    });
    setQuotePositions(newPositions);
  }, [comments, song]);

  const handleQuoteClick = () => {
    setActiveQuote(selectedText);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center text-brand-muted flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          {language === 'en' ? 'Loading song...' : 'Lastar inn songen...'}
        </motion.div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="bg-brand-surface min-h-screen py-32 text-center px-6">
        <h1 className="text-3xl font-serif text-brand-dark mb-4">
          {language === 'en' ? 'Song not found' : 'Fann ikkje songen'}
        </h1>
        <Link
          to="/musikk"
          className="text-brand-accent hover:text-brand-dark transition-colors uppercase tracking-widest text-xs font-semibold"
        >
          {language === 'en' ? 'BACK TO MUSIC' : 'TILBAKE TIL MUSIKK'}
        </Link>
      </div>
    );
  }

  const isThisSongCurrent = currentSong?.id === song.id;
  const isThisSongPlaying = isThisSongCurrent && isPlaying;
  const activeTime = isThisSongCurrent ? currentTime : 0;
  const activeDuration =
    isThisSongCurrent && duration > 0 ? duration : song.durationSeconds || 0;

  const otherSongs = allSongs
    .filter((s) => s.id !== song.id && (isAdmin || s.published !== false))
    .slice(0, 3);

  return (
    <div className="bg-brand-surface min-h-screen pb-32">
      <motion.section
        className="py-16 md:py-24 px-6 md:px-12 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Top Navigation Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <Link
            to="/musikk"
            className="inline-flex items-center text-brand-muted hover:text-brand-dark transition-colors font-sans text-xs font-semibold tracking-widest uppercase"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            {language === 'en' ? 'ALL SONGS' : 'ALLE SONGAR'}
          </Link>

          <div className="flex items-center gap-4">
            {translationSlug && (
              <Link
                to={`/musikk/${translationSlug}`}
                onClick={() => setLanguage((song.language || 'no') === 'en' ? 'no' : 'en')}
                className="inline-flex items-center text-brand-accent hover:text-brand-dark text-xs font-semibold tracking-widest uppercase transition-colors"
              >
                {song.language === 'en' ? 'Les på norsk' : 'Read in English'} &rarr;
              </Link>
            )}

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-widest uppercase text-brand-muted hover:text-brand-dark transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700">{language === 'en' ? 'Copied' : 'Kopiert'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? 'Share' : 'Del'}</span>
                </>
              )}
            </button>

            {isAdmin && song.id && (
              <Link
                to={`/admin?edit_song=${song.id}`}
                className="inline-flex items-center gap-1.5 bg-brand-dark text-white px-3.5 py-1.5 text-xs font-sans font-semibold tracking-widest uppercase hover:bg-black transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Edit Song' : 'Rediger song'}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Song Hero Card & Integrated Music Player */}
        <div className="bg-white border border-brand-sand shadow-sm p-6 sm:p-8 md:p-10 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Cover Artwork */}
            <div className="md:col-span-5">
              <div className="aspect-square w-full max-w-[320px] mx-auto md:max-w-none bg-[#181512] border border-brand-sand overflow-hidden relative">
                {song.coverImageUrl ? (
                  <img
                    src={song.coverImageUrl}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#231F1C] via-[#181512] to-[#12100E]">
                    <div className="w-36 h-36 rounded-full border border-white/10 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                        <Music className="w-8 h-8 text-brand-accent" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {song.coverImageCaption && (
                <p
                  className="text-xs text-brand-muted italic mt-2 text-center md:text-left"
                  dangerouslySetInnerHTML={{ __html: song.coverImageCaption }}
                />
              )}
            </div>

            {/* Song Info & Embedded Audio Player */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-sans uppercase tracking-widest text-brand-muted font-semibold mb-3">
                  <span>Øivind H. Solheim</span>
                  {song.genre && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-brand-accent">{song.genre}</span>
                    </>
                  )}
                  {song.releaseYear && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{song.releaseYear}</span>
                    </>
                  )}
                  {song.language && song.language !== 'both' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{song.language === 'en' ? 'English' : 'Norsk'}</span>
                    </>
                  )}
                  {!song.published && isAdmin && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700">Utkast</span>
                    </>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-brand-dark leading-tight mb-4">
                  {song.title}
                </h1>

                {song.description && (
                  <p className="text-sm sm:text-base text-brand-dark/80 font-sans leading-relaxed">
                    {song.description}
                  </p>
                )}
              </div>

              {/* Embedded Player Box */}
              {song.audioUrl ? (
                <div className="bg-brand-surface border border-brand-sand p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => playSong(song, allSongs.filter((s) => Boolean(s.audioUrl)))}
                      className="w-14 h-14 rounded-full bg-brand-dark hover:bg-brand-accent text-white hover:text-brand-dark flex items-center justify-center transition-colors shrink-0 shadow-md"
                      aria-label={isThisSongPlaying ? 'Pause' : 'Spel av'}
                    >
                      {isThisSongCurrent && isBuffering ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isThisSongPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-sans mb-1.5">
                        <span className="font-semibold uppercase tracking-wider text-brand-dark">
                          {isThisSongPlaying
                            ? language === 'en'
                              ? 'Now Playing'
                              : 'Spelar no'
                            : language === 'en'
                            ? 'Listen to song'
                            : 'Lytt til songen'}
                        </span>
                        <span className="font-mono tabular-nums text-brand-muted">
                          {formatDuration(activeTime)} / {formatDuration(activeDuration)}
                        </span>
                      </div>

                      {/* Timeline Scrubber */}
                      <input
                        type="range"
                        min={0}
                        max={activeDuration || 100}
                        step={0.5}
                        value={activeTime}
                        onChange={(e) => {
                          const targetTime = Number(e.target.value);
                          if (!isThisSongCurrent) {
                            playSong(song, allSongs.filter((s) => Boolean(s.audioUrl))).then(() => {
                              seek(targetTime);
                            });
                          } else {
                            seek(targetTime);
                          }
                        }}
                        className="w-full h-1.5 bg-brand-sand rounded-lg appearance-none cursor-pointer accent-brand-dark"
                      />
                    </div>
                  </div>

                  {/* Secondary Controls: Volume & Download */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-brand-sand/70 text-xs font-sans text-brand-muted">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="text-brand-muted hover:text-brand-dark transition-colors p-1"
                        title={isMuted ? 'Slå på lyd' : 'Demp lyd'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-24 h-1 bg-brand-sand rounded-lg appearance-none cursor-pointer accent-brand-dark"
                      />
                      {song.audioFormat && (
                        <span className="uppercase font-mono text-[10px] text-brand-muted ml-2">
                          {song.audioFormat.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {song.allowDownload && (
                      <button
                        type="button"
                        onClick={() => downloadSong(song)}
                        className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-widest uppercase text-brand-dark hover:text-brand-accent transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Download Audio' : 'Last ned lydfil'}</span>
                      </button>
                    )}
                  </div>

                  {isThisSongCurrent && playerError && (
                    <p className="text-xs text-red-600 font-sans">{playerError}</p>
                  )}
                </div>
              ) : (
                <div className="bg-brand-surface border border-brand-sand p-4 text-xs font-sans text-brand-muted">
                  {language === 'en'
                    ? 'Lyrics published. Audio recording coming soon.'
                    : 'Songteksten er publisert. Lydopptak er ikkje lagt til enno.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Song Lyrics Section with Margin Comments */}
        <div className="relative">
          <div
            ref={contentRef}
            className="bg-white p-8 sm:p-12 md:p-16 border border-brand-sand shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-brand-sand pb-4 mb-8">
              <h2 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-brand-muted">
                {language === 'en' ? 'SONG LYRICS' : 'SONGTEKST'}
              </h2>
              <span className="text-xs font-serif italic text-brand-muted">
                {song.title}
              </span>
            </div>

            <LyricsContent content={song.lyrics} />
          </div>

          {/* Margin Annotations Layer */}
          {quotePositions.map((pos) => {
            const isHoveredOrActive = activeMarginCommentId === pos.commentId;
            const comment = comments.find((c) => c.id === pos.commentId);
            if (!comment) return null;

            return (
              <div
                key={pos.commentId}
                className="absolute flex items-center justify-center cursor-pointer transition-all right-2 lg:-right-12"
                style={{
                  top: `${pos.top}px`,
                  width: '32px',
                  height: '32px',
                  zIndex: isHoveredOrActive ? 50 : 40
                }}
              >
                <div
                  className={`margin-comment-icon transition-colors p-2 rounded-full shadow-sm border border-gray-200 ${
                    isHoveredOrActive
                      ? 'bg-brand-accent text-white scale-110'
                      : 'bg-brand-sand hover:bg-brand-accent hover:text-white hover:scale-110 text-brand-dark'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMarginCommentId(isHoveredOrActive ? null : pos.commentId);
                  }}
                >
                  <MessageSquarePlus className="w-4 h-4 pointer-events-none" />
                </div>

                <AnimatePresence>
                  {isHoveredOrActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="margin-comment-card absolute top-10 right-0 lg:left-10 lg:right-auto w-64 bg-white p-4 shadow-xl border border-gray-200 rounded text-left cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {comment.userAvatar ? (
                          <img src={comment.userAvatar} alt={comment.userName} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-sand text-brand-dark flex items-center justify-center text-[10px] font-semibold">
                            {comment.userName.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-brand-dark truncate">{comment.userName}</span>
                      </div>
                      <p className="text-sm text-brand-dark/90 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      <button
                        className="mt-4 text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-colors font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedCommentId(pos.commentId);
                          setActiveMarginCommentId(null);
                          const el = document.getElementById(`comment-${pos.commentId}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        {language === 'en' ? 'View in comment section' : 'Vis i kommentarfelt'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Text Selection Popup for Commenting on Lyrics */}
        <AnimatePresence>
          {selectionPosition && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'absolute',
                top: selectionPosition.top,
                left: selectionPosition.left,
                transform: 'translateX(-50%)',
                zIndex: 50
              }}
              className="bg-brand-dark text-white rounded shadow-2xl flex items-center"
            >
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleQuoteClick();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleQuoteClick();
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-black transition-colors rounded"
              >
                <MessageSquarePlus className="w-4 h-4" />
                {language === 'en' ? 'Comment line' : 'Kommenter tekstlinje'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* More Songs Navigation */}
        {otherSongs.length > 0 && (
          <div className="mt-16 pt-12 border-t border-brand-sand">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-brand-muted">
                {language === 'en' ? 'MORE SONGS' : 'FLEIRE SONGAR'}
              </h3>
              <Link
                to="/musikk"
                className="text-xs font-sans font-semibold tracking-widest uppercase text-brand-accent hover:text-brand-dark transition-colors"
              >
                {language === 'en' ? 'See all →' : 'Sjå alle →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {otherSongs.map((other) => {
                const otherUrl = `/musikk/${other.slug || other.id || slugify(other.title)}`;
                return (
                  <Link
                    key={other.id}
                    to={otherUrl}
                    className="group bg-white border border-brand-sand p-4 flex items-center gap-4 hover:border-brand-dark/40 transition-colors"
                  >
                    <div className="w-14 h-14 bg-[#181512] shrink-0 overflow-hidden flex items-center justify-center">
                      {other.coverImageUrl ? (
                        <img
                          src={other.coverImageUrl}
                          alt={other.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Music className="w-5 h-5 text-brand-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-base text-brand-dark group-hover:text-brand-accent transition-colors truncate">
                        {other.title}
                      </h4>
                      <p className="text-xs font-sans text-brand-muted truncate">
                        {other.genre || (language === 'en' ? 'Song' : 'Song')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {song.id && (
          <div id="comments-section">
            <Comments
              articleId={song.id}
              initialQuote={activeQuote}
              comments={comments}
              loading={commentsLoading}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              focusedCommentId={focusedCommentId}
            />
          </div>
        )}
      </motion.section>
    </div>
  );
}

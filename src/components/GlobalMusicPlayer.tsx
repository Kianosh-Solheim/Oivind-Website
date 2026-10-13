import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  X,
  Music,
  FileText
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDuration } from '../lib/songService';
import { slugify } from '../lib/utils';

export default function GlobalMusicPlayer() {
  const {
    currentSong,
    queue,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    playerError,
    togglePlay,
    seek,
    nextSong,
    prevSong,
    setVolume,
    toggleMute,
    closePlayer,
    downloadSong
  } = useMusicPlayer();
  const { language } = useLanguage();

  if (!currentSong) return null;

  const songUrl = `/musikk/${currentSong.slug || currentSong.id || slugify(currentSong.title)}`;
  const effectiveDuration = duration > 0 ? duration : (currentSong.durationSeconds || 0);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#181614]/95 backdrop-blur-md text-white border-t border-white/15 shadow-[0_-10px_30px_rgba(0,0,0,0.35)]">
      {/* Subtle interactive top progress bar */}
      <div
        className="w-full h-1.5 bg-white/10 cursor-pointer group relative"
        onClick={(e) => {
          if (!effectiveDuration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seek(ratio * effectiveDuration);
        }}
        title={language === 'en' ? 'Click to seek' : 'Klikk for å spole'}
      >
        <div
          className="h-full bg-brand-accent transition-all duration-100 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <span className="w-3 h-3 rounded-full bg-white shadow-md absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 py-3 flex items-center justify-between gap-4">
        {/* Left: Cover & Track Info */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 sm:flex-initial sm:w-72 md:w-80">
          <Link
            to={songUrl}
            className="w-12 h-12 rounded-sm overflow-hidden bg-stone-800 border border-white/10 shrink-0 flex items-center justify-center group relative"
          >
            {currentSong.coverImageUrl ? (
              <img
                src={currentSong.coverImageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <Music className="w-5 h-5 text-brand-accent" />
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={songUrl}
              className="block font-serif text-sm sm:text-base text-white hover:text-brand-accent transition-colors truncate"
            >
              {currentSong.title}
            </Link>
            <div className="flex items-center gap-2 text-[11px] font-sans text-stone-400 truncate">
              <span>Øivind H. Solheim</span>
              {currentSong.genre && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{currentSong.genre}</span>
                </>
              )}
            </div>
            {playerError && (
              <p className="text-[11px] text-amber-400 truncate mt-0.5">{playerError}</p>
            )}
          </div>
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={prevSong}
              disabled={queue.length <= 1 && currentTime < 3}
              className="text-stone-400 hover:text-white disabled:opacity-40 transition-colors p-1.5"
              title={language === 'en' ? 'Previous' : 'Førre'}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-brand-accent hover:bg-[#b58952] text-brand-dark flex items-center justify-center transition-transform active:scale-95 shadow-md"
              title={isPlaying ? (language === 'en' ? 'Pause' : 'Pause') : (language === 'en' ? 'Play' : 'Spel av')}
            >
              {isBuffering ? (
                <div className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={nextSong}
              disabled={queue.length <= 1}
              className="text-stone-400 hover:text-white disabled:opacity-40 transition-colors p-1.5"
              title={language === 'en' ? 'Next' : 'Neste'}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 w-full mt-1.5">
            <span className="text-[11px] font-mono tabular-nums text-stone-400 w-9 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={effectiveDuration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => seek( Number(e.target.value) )}
              className="flex-1 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
            <span className="text-[11px] font-mono tabular-nums text-stone-400 w-9">
              {formatDuration(effectiveDuration)}
            </span>
          </div>
        </div>

        {/* Right: Lyrics Link, Download, Volume, Close */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 sm:w-72 md:w-80">
          <Link
            to={songUrl}
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold tracking-widest uppercase text-stone-300 hover:text-brand-accent transition-colors px-2.5 py-1.5 border border-white/10 hover:border-brand-accent/40 rounded-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Lyrics' : 'Songtekst'}</span>
          </Link>

          {currentSong.allowDownload && currentSong.audioUrl && (
            <button
              type="button"
              onClick={() => downloadSong(currentSong)}
              className="p-2 text-stone-400 hover:text-white transition-colors"
              title={language === 'en' ? 'Download audio' : 'Last ned lydfil'}
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-stone-400 hover:text-white transition-colors"
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
              className="w-20 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
          </div>

          <button
            type="button"
            onClick={closePlayer}
            className="p-2 text-stone-400 hover:text-white transition-colors ml-1"
            title={language === 'en' ? 'Close player' : 'Lukk spelar'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

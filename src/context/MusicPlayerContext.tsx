import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Song } from '../types';
import { resolvePlayableAudioUrl } from '../lib/songService';

interface MusicPlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playerError: string | null;
  playSong: (song: Song, songQueue?: Song[]) => Promise<void>;
  togglePlay: () => void;
  seek: (timeSeconds: number) => void;
  nextSong: () => void;
  prevSong: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  closePlayer: () => void;
  downloadSong: (song: Song) => Promise<void>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const queueRef = useRef<Song[]>([]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const loadAndPlayTrack = useCallback(async (song: Song) => {
    if (!song.audioUrl) {
      setPlayerError('Denne songen har ikkje ei lydfil knytt til seg enno.');
      setIsPlaying(false);
      return;
    }

    setPlayerError(null);
    setIsBuffering(true);
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.durationSeconds || 0);

    try {
      const playableUrl = await resolvePlayableAudioUrl(song.audioUrl);
      if (!playableUrl) {
        throw new Error('Kunne ikkje laste lydfil.');
      }

      const audio = audioRef.current;
      if (!audio) return;

      audio.pause();
      audio.src = playableUrl;
      audio.load();
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Audio playback error:', err);
      setPlayerError('Kunne ikkje spele av lydfila. Sjekk at lydformatet (MP3/M4A/Opus) er gyldig.');
      setIsPlaying(false);
    } finally {
      setIsBuffering(false);
    }
  }, []);

  const playSong = useCallback(
    async (song: Song, songQueue?: Song[]) => {
      if (songQueue && songQueue.length > 0) {
        const playableQueue = songQueue.filter((s) => Boolean(s.audioUrl));
        setQueue(playableQueue);
      } else if (queueRef.current.length === 0 && song.audioUrl) {
        setQueue([song]);
      }

      const active = currentSongRef.current;
      if (active && active.id === song.id && audioRef.current && audioRef.current.src) {
        // Toggle play/pause on same song
        if (audioRef.current.paused) {
          setPlayerError(null);
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (err) {
            console.error('Resume play error:', err);
          }
        } else {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        return;
      }

      await loadAndPlayTrack(song);
    },
    [loadAndPlayTrack]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const active = currentSongRef.current;
    if (!audio || !active) return;

    if (!audio.src && active.audioUrl) {
      loadAndPlayTrack(active);
      return;
    }

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [loadAndPlayTrack]);

  const seek = useCallback((timeSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(timeSeconds, duration || audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const nextSong = useCallback(() => {
    const list = queueRef.current;
    const active = currentSongRef.current;
    if (!active || list.length === 0) return;

    const idx = list.findIndex((s) => s.id === active.id);
    if (idx >= 0 && list.length > 1) {
      const nextIdx = (idx + 1) % list.length;
      loadAndPlayTrack(list[nextIdx]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [loadAndPlayTrack]);

  const prevSong = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const list = queueRef.current;
    const active = currentSongRef.current;
    if (!active || list.length === 0) return;

    const idx = list.findIndex((s) => s.id === active.id);
    if (idx >= 0 && list.length > 1) {
      const prevIdx = (idx - 1 + list.length) % list.length;
      loadAndPlayTrack(list[prevIdx]);
    } else if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  }, [loadAndPlayTrack]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0) setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentTime(0);
    setPlayerError(null);
  }, []);

  const downloadSong = useCallback(async (song: Song) => {
    if (!song.audioUrl) return;
    try {
      const playableUrl = await resolvePlayableAudioUrl(song.audioUrl);
      if (!playableUrl) return;
      const ext = song.audioFormat || 'mp3';
      const safeTitle = (song.title || 'song').replace(/[^a-zA-Z0-9æøåÆØÅ _-]/g, '').trim() || 'song';
      const a = document.createElement('a');
      a.href = playableUrl;
      a.download = `${safeTitle}.${ext}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download song:', err);
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsBuffering(false);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      const list = queueRef.current;
      const active = currentSongRef.current;
      if (active && list.length > 1) {
        const idx = list.findIndex((s) => s.id === active.id);
        if (idx >= 0 && idx < list.length - 1) {
          loadAndPlayTrack(list[idx + 1]);
          return;
        }
      }
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [loadAndPlayTrack]);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        queue,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        playerError,
        playSong,
        togglePlay,
        seek,
        nextSong,
        prevSong,
        setVolume,
        toggleMute,
        closePlayer,
        downloadSong
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return ctx;
}

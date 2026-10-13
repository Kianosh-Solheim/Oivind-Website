import { db, storage } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  documentId
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getCachedDocs, invalidateCache } from './dbCache';
import { Song } from '../types';

const resolvedAudioBlobCache = new Map<string, string>();

export function formatDuration(seconds?: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSec = Math.round(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function detectAudioFormat(fileNameOrUrl: string, mimeType?: string): string {
  const lower = (fileNameOrUrl || '').toLowerCase();
  if (lower.endsWith('.mp3') || mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') return 'mp3';
  if (lower.endsWith('.m4a') || lower.endsWith('.aac') || mimeType === 'audio/mp4' || mimeType === 'audio/aac' || mimeType === 'audio/x-m4a') return 'm4a';
  if (lower.endsWith('.opus') || mimeType === 'audio/opus') return 'opus';
  if (lower.endsWith('.ogg') || mimeType === 'audio/ogg') return 'ogg';
  if (lower.endsWith('.wav') || mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return 'wav';
  if (lower.endsWith('.flac') || mimeType === 'audio/flac') return 'flac';
  return 'mp3';
}

export function getAudioMimeType(format?: string): string {
  switch ((format || '').toLowerCase()) {
    case 'm4a':
    case 'aac':
      return 'audio/mp4';
    case 'opus':
      return 'audio/ogg; codecs=opus';
    case 'ogg':
      return 'audio/ogg';
    case 'wav':
      return 'audio/wav';
    case 'flac':
      return 'audio/flac';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}

export async function readAudioMetadata(file: File): Promise<{ durationSeconds: number; audioFormat: string }> {
  const audioFormat = detectAudioFormat(file.name, file.type);
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve({ durationSeconds: 0, audioFormat });
      }, 6000);

      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        const dur = isFinite(audio.duration) ? Math.round(audio.duration) : 0;
        cleanup();
        resolve({ durationSeconds: dur, audioFormat });
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve({ durationSeconds: 0, audioFormat });
      };

      audio.src = objectUrl;
    } catch {
      resolve({ durationSeconds: 0, audioFormat });
    }
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];
  const sliceSize = 16384;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

export async function uploadSongAudio(
  file: File,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{
  audioUrl: string;
  audioFormat: string;
  audioFileName: string;
  durationSeconds: number;
}> {
  onProgress?.(5, 'Leser lydmetadata...');
  const { durationSeconds, audioFormat } = await readAudioMetadata(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 1. Try Firebase Storage first
  const tryFirebaseStorage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const storagePath = `songs/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || getAudioMimeType(audioFormat)
        });

        let startedProgress = false;
        const stallTimer = setTimeout(() => {
          if (!startedProgress) {
            uploadTask.cancel();
            reject(new Error('Storage timeout - using Firestore fallback'));
          }
        }, 5500);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > 0) {
              startedProgress = true;
              clearTimeout(stallTimer);
            }
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90) + 5;
            onProgress?.(pct, 'Lastar opp til sky-lagring...');
          },
          (error) => {
            clearTimeout(stallTimer);
            reject(error);
          },
          async () => {
            clearTimeout(stallTimer);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (err) {
              reject(err);
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  try {
    const storageUrl = await tryFirebaseStorage();
    onProgress?.(100, 'Opplasting fullført!');
    return {
      audioUrl: storageUrl,
      audioFormat,
      audioFileName: file.name,
      durationSeconds
    };
  } catch (storageErr) {
    console.warn('Firebase Storage upload fell back to Firestore chunk storage:', storageErr);
  }

  // 2. Fallback: Chunked Firestore Audio Storage (supports up to ~25MB audio files reliably)
  const maxFirestoreBytes = 25 * 1024 * 1024;
  if (file.size > maxFirestoreBytes) {
    throw new Error('Lydfila er over 25 MB og Firebase Storage-reglar avviste direkte opplasting. Komprimer gjerne lydfila til MP3 eller M4A/Opus (under 25 MB), eller lim inn ein ekstern lyd-URL.');
  }

  onProgress?.(12, 'Klargjer lydfil for lagring i databasen...');
  const base64Data = await fileToBase64(file);
  const chunkSize = 650000; // ~485 KB per Firestore document (well below 1 MiB limit)
  const totalChunks = Math.ceil(base64Data.length / chunkSize);
  const audioId = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = file.type || getAudioMimeType(audioFormat);

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkDocId = `${audioId}_chunk_${String(i).padStart(4, '0')}`;
    const payload = {
      docType: 'song_audio_chunk',
      audioId,
      chunkIndex: i,
      totalChunks,
      mimeType,
      audioFormat,
      fileName: file.name,
      data: chunkData,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'song_audio_chunks', chunkDocId), payload);
    } catch {
      // Fallback to `stats` collection which is open for read/write on existing oivind-web rules
      await setDoc(doc(db, 'stats', chunkDocId), payload);
    }

    const pct = Math.round(((i + 1) / totalChunks) * 84) + 15;
    onProgress?.(pct, `Lagrar lydblokk ${i + 1} av ${totalChunks}...`);
  }

  // Cache playable blob URL immediately so admin can play right away without re-fetching
  const blob = base64ToBlob(base64Data, mimeType);
  const localBlobUrl = URL.createObjectURL(blob);
  const customUri = `firestore-audio://${audioId}`;
  resolvedAudioBlobCache.set(customUri, localBlobUrl);

  onProgress?.(100, 'Opplasting fullført!');
  return {
    audioUrl: customUri,
    audioFormat,
    audioFileName: file.name,
    durationSeconds
  };
}

export async function resolvePlayableAudioUrl(audioUrl?: string): Promise<string> {
  if (!audioUrl) return '';
  if (!audioUrl.startsWith('firestore-audio://')) {
    return audioUrl;
  }

  const cached = resolvedAudioBlobCache.get(audioUrl);
  if (cached) return cached;

  const audioId = audioUrl.replace('firestore-audio://', '').trim();
  if (!audioId) return '';

  let chunkDocs: any[] = [];

  try {
    const q1 = query(collection(db, 'song_audio_chunks'), where('audioId', '==', audioId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      chunkDocs = snap1.docs.map((d) => d.data());
    }
  } catch {
    // Ignore permission error and check fallback
  }

  if (chunkDocs.length === 0) {
    try {
      const q2 = query(collection(db, 'stats'), where('audioId', '==', audioId));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        chunkDocs = snap2.docs.map((d) => d.data());
      }
    } catch (err) {
      console.error('Failed to load audio chunks from fallback:', err);
    }
  }

  if (chunkDocs.length === 0) {
    throw new Error('Fann ikkje lyddata for denne songen.');
  }

  chunkDocs.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
  const fullBase64 = chunkDocs.map((c) => c.data || '').join('');
  const mimeType = chunkDocs[0]?.mimeType || 'audio/mpeg';

  const blob = base64ToBlob(fullBase64, mimeType);
  const blobUrl = URL.createObjectURL(blob);
  resolvedAudioBlobCache.set(audioUrl, blobUrl);
  return blobUrl;
}

export async function fetchAllSongs(includeDrafts = false): Promise<Song[]> {
  const songMap = new Map<string, Song>();

  // 1. Try primary `songs` collection
  try {
    const qSongs = includeDrafts
      ? query(collection(db, 'songs'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'songs'), where('published', '==', true));
    const snap = await getCachedDocs(qSongs, includeDrafts ? 'songs_all_admin' : 'songs_published');
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as Song;
      if (includeDrafts || data.published !== false) {
        songMap.set(docSnap.id, {
          ...data,
          id: docSnap.id,
          collectionName: 'songs'
        });
      }
    });
  } catch (err) {
    console.warn('Primary songs collection query fell back to stats collection:', err);
  }

  // 2. Also check fallback `stats` collection where docType == 'song'
  try {
    const qFallback = query(collection(db, 'stats'), where('docType', '==', 'song'));
    const snapFallback = await getCachedDocs(qFallback, 'songs_stats_fallback');
    snapFallback.docs.forEach((docSnap) => {
      const data = docSnap.data() as Song;
      if (!songMap.has(docSnap.id) && (includeDrafts || data.published !== false)) {
        songMap.set(docSnap.id, {
          ...data,
          id: docSnap.id,
          collectionName: 'stats'
        });
      }
    });
  } catch (err) {
    console.warn('Fallback songs query warning:', err);
  }

  const list = Array.from(songMap.values());
  list.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return timeB - timeA;
  });

  return list;
}

export async function fetchSongBySlugOrId(slugOrId: string, includeDrafts = false): Promise<Song | null> {
  if (!slugOrId) return null;

  // First search through all available songs (fast and handles both collections + slug/id)
  const allSongs = await fetchAllSongs(includeDrafts);
  const bySlug = allSongs.find((s) => s.slug === slugOrId);
  if (bySlug) return bySlug;

  const byId = allSongs.find((s) => s.id === slugOrId);
  if (byId) return byId;

  // Direct document lookup fallback
  try {
    const docSnap = await getDoc(doc(db, 'songs', slugOrId));
    if (docSnap.exists()) {
      const data = docSnap.data() as Song;
      if (includeDrafts || data.published !== false) {
        return { ...data, id: docSnap.id, collectionName: 'songs' };
      }
    }
  } catch {}

  try {
    const docSnap = await getDoc(doc(db, 'stats', slugOrId));
    if (docSnap.exists() && docSnap.data()?.docType === 'song') {
      const data = docSnap.data() as Song;
      if (includeDrafts || data.published !== false) {
        return { ...data, id: docSnap.id, collectionName: 'stats' };
      }
    }
  } catch {}

  return null;
}

export async function saveSongDocument(
  songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string | null
): Promise<string> {
  const cleanPayload: Record<string, any> = {
    title: songData.title || 'Utan tittel',
    slug: songData.slug || '',
    lyrics: songData.lyrics || '',
    description: songData.description || '',
    genre: songData.genre || '',
    releaseYear: Number(songData.releaseYear) || new Date().getFullYear(),
    coverImageUrl: songData.coverImageUrl || '',
    coverImageCaption: songData.coverImageCaption || '',
    audioUrl: songData.audioUrl || '',
    audioFormat: songData.audioFormat || 'mp3',
    audioFileName: songData.audioFileName || '',
    durationSeconds: Number(songData.durationSeconds) || 0,
    allowDownload: Boolean(songData.allowDownload),
    published: songData.published ?? true,
    language: songData.language || 'no',
    translationId: songData.translationId || '',
    docType: 'song',
    updatedAt: serverTimestamp()
  };

  let savedId = existingId || '';

  if (existingId) {
    let updatedPrimary = false;
    try {
      await updateDoc(doc(db, 'songs', existingId), cleanPayload);
      updatedPrimary = true;
    } catch {
      // May live in fallback stats collection or songs rules not deployed yet
    }

    try {
      const fallbackRef = doc(db, 'stats', existingId);
      const fallbackSnap = await getDoc(fallbackRef);
      if (fallbackSnap.exists() || !updatedPrimary) {
        await setDoc(
          fallbackRef,
          {
            ...cleanPayload,
            ...(fallbackSnap.exists() ? {} : { createdAt: serverTimestamp() })
          },
          { merge: true }
        );
      }
    } catch (err) {
      if (!updatedPrimary) throw err;
    }
  } else {
    const newPayload = {
      ...cleanPayload,
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'songs'), newPayload);
      savedId = docRef.id;
    } catch {
      const fallbackRef = doc(collection(db, 'stats'));
      await setDoc(fallbackRef, newPayload);
      savedId = fallbackRef.id;
    }
  }

  invalidateCache('songs_all_admin');
  invalidateCache('songs_published');
  invalidateCache('songs_stats_fallback');

  return savedId;
}

export async function deleteSongDocument(songId: string): Promise<void> {
  if (!songId) return;

  try {
    await deleteDoc(doc(db, 'songs', songId));
  } catch {}

  try {
    await deleteDoc(doc(db, 'stats', songId));
  } catch {}

  invalidateCache('songs_all_admin');
  invalidateCache('songs_published');
  invalidateCache('songs_stats_fallback');
}

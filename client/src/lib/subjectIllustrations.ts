import mathCover from '@/assets/course-covers/math.svg';
import musicCover from '@/assets/course-covers/music.svg';
import spanishCover from '@/assets/course-covers/spanish.svg';
import chemistryCover from '@/assets/course-covers/chemistry.svg';
import svtCover from '@/assets/course-covers/svt.svg';
import philosophyCover from '@/assets/course-covers/philosophy.svg';
import epsCover from '@/assets/course-covers/eps.svg';
import officeCover from '@/assets/course-covers/office.svg';
import englishCover from '@/assets/course-covers/english.svg';
import artsCover from '@/assets/course-covers/arts.svg';
import historyCover from '@/assets/course-covers/history.svg';
import edhcCover from '@/assets/course-covers/edhc.svg';
import economyCover from '@/assets/course-covers/economy.svg';
import frenchCover from '@/assets/course-covers/french.svg';
import defaultCover from '@/assets/course-covers/default.svg';
import { getFileUrl } from '@/lib/api';

export const PRESET_COVERS: { [key: string]: { label: string; src: string } } = {
  math: { label: 'Mathématiques', src: mathCover },
  french: { label: 'Français', src: frenchCover },
  english: { label: 'Anglais', src: englishCover },
  chemistry: { label: 'Physique-Chimie', src: chemistryCover },
  svt: { label: 'SVT & Biologie', src: svtCover },
  history: { label: 'Histoire-Géo', src: historyCover },
  philosophy: { label: 'Philosophie', src: philosophyCover },
  eps: { label: 'EPS & Sport', src: epsCover },
  music: { label: 'Musique', src: musicCover },
  arts: { label: 'Arts Plastiques', src: artsCover },
  spanish: { label: 'Langues / Espagnol', src: spanishCover },
  edhc: { label: 'EDHC & Civisme', src: edhcCover },
  economy: { label: 'Économie & Gestion', src: economyCover },
  office: { label: 'Informatique / TIC', src: officeCover },
  default: { label: 'Général / Autre', src: defaultCover },
};

export const getSubjectIllustration = (subjectName?: string | null, customImg?: string | null): string => {
  if (customImg && customImg.trim() !== '') {
    const trimmed = customImg.trim();
    if (PRESET_COVERS[trimmed]) {
      return PRESET_COVERS[trimmed].src;
    }
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) {
      return getFileUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
    }
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
  }

  const s = (subjectName || '').toLowerCase().trim();
  if (s.includes('sport') || s.includes('eps') || s.includes('physique-eps') || s.includes('gym')) return epsCover;
  if (s.includes('math')) return mathCover;
  if (s.includes('franc') || s.includes('franç') || s.includes('dictée') || s.includes('grammaire')) return frenchCover;
  if (s.includes('anglais') || s.includes('angl') || s.includes('english')) return englishCover;
  if (s.includes('physique') || s.includes('chimie') || s.includes('pc')) return chemistryCover;
  if (s.includes('svt') || s.includes('science') || s.includes('biologie') || s.includes('terre')) return svtCover;
  if (s.includes('histoire') || s.includes('geo') || s.includes('géo') || s.includes('hg')) return historyCover;
  if (s.includes('philo')) return philosophyCover;
  if (s.includes('musique') || s.includes('music') || s.includes('chant')) return musicCover;
  if (s.includes('art') || s.includes('plastique') || s.includes('dessin')) return artsCover;
  if (s.includes('espagnol') || s.includes('esp') || s.includes('allemand')) return spanishCover;
  if (s.includes('edhc') || s.includes('civique') || s.includes('morale') || s.includes('droit')) return edhcCover;
  if (s.includes('eco') || s.includes('éco') || s.includes('compta') || s.includes('gestion')) return economyCover;
  if (s.includes('info') || s.includes('bureautique') || s.includes('tic') || s.includes('ordinateur')) return officeCover;
  return defaultCover;
};

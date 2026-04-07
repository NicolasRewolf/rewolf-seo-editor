export function stemFr(token: string): string {
  const raw = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

  if (!raw) return '';

  let stem = raw;

  const apply = (
    suffix: string,
    replacement: string,
    minStemLength = 3
  ): boolean => {
    if (!stem.endsWith(suffix)) return false;
    const candidate = stem.slice(0, -suffix.length) + replacement;
    if (candidate.length < minStemLength) return false;
    stem = candidate;
    return true;
  };

  // Noms/adverbes fréquents
  if (!apply('ements', '', 3)) {
    if (!apply('ement', '', 3)) {
      if (!apply('ments', '', 3)) apply('ment', '', 3);
    }
  }

  // Verbes (imparfait / 3e pers. pluriel)
  if (!apply('aient', '', 2)) {
    if (!apply('ait', '', 2)) apply('ent', '', 2);
  }

  // Infinitifs
  if (!apply('er', '', 2)) apply('ir', '', 2);

  // -tion(s)
  if (!apply('tions', '', 2)) apply('tion', '', 2);

  // Pluriels irréguliers courants
  apply('aux', 'al', 3);

  // Pluriel/féminin/accords usuels
  if (!apply('ees', '', 3)) {
    if (!apply('ee', '', 3)) {
      if (!apply('es', '', 3)) {
        if (!apply('s', '', 3)) apply('x', '', 3);
      }
    }
  }

  // Terminai son muette fréquente ("avocate" -> "avocat")
  if (stem.endsWith('e') && stem.length > 4) {
    stem = stem.slice(0, -1);
  }

  return stem || raw;
}

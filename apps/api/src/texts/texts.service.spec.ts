// Builders purs des filtres de liasse (tbd n°3) — le reste du service est du
// Prisma fin, couvert par la vérification bout-en-bout.

import {
  buildAmendmentOrderBy,
  buildAmendmentWhere,
  SORT_AUCUN,
} from './texts.service';

describe('buildAmendmentWhere', () => {
  it('ne filtre que par texteRef sans filtres', () => {
    expect(buildAmendmentWhere('REF', {})).toEqual({ texteRef: 'REF' });
  });

  it('sort=aucun matche sort null ou vide', () => {
    expect(buildAmendmentWhere('REF', { sort: SORT_AUCUN })).toEqual({
      texteRef: 'REF',
      OR: [{ sort: null }, { sort: '' }],
    });
  });

  it('sort exact sinon', () => {
    expect(buildAmendmentWhere('REF', { sort: 'Adopté' }).sort).toBe('Adopté');
  });

  it('q cherche numéro OU article sans écraser le OR de sort=aucun', () => {
    const where = buildAmendmentWhere('REF', { sort: SORT_AUCUN, q: '12' });
    expect(where.OR).toEqual([{ sort: null }, { sort: '' }]);
    expect(where.AND).toEqual([
      {
        OR: [
          { numero: { contains: '12', mode: 'insensitive' } },
          { articleReference: { contains: '12', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('article et status filtrent', () => {
    const where = buildAmendmentWhere('REF', {
      article: 'art. 2',
      status: 'PENDING',
    });
    expect(where.articleReference).toEqual({
      contains: 'art. 2',
      mode: 'insensitive',
    });
    expect(where.status).toBe('PENDING');
  });
});

describe('buildAmendmentOrderBy', () => {
  it('numero asc par défaut', () => {
    expect(buildAmendmentOrderBy()).toEqual([{ numero: 'asc' }]);
    expect(buildAmendmentOrderBy('numero')).toEqual([{ numero: 'asc' }]);
  });

  it('dateDepot avec numero en départage', () => {
    expect(buildAmendmentOrderBy('dateDepot')).toEqual([
      { dateDepot: 'asc' },
      { numero: 'asc' },
    ]);
  });
});

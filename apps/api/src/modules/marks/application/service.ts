import { Temporal } from '@js-temporal/polyfill';
import {
  computeSightMarks,
  createSightModel,
  SIGHT_CALC_MIN_MARKS,
  type SightPoint,
} from '@bow-sight/domain';
import type { MarkCreate, MarkQuery, MarkUpdate } from '@bow-sight/schemas';
import { appError } from '../../../http/errors.js';
import { VIVOS } from '../../../persistence/base.js';
import type { OwnedRepository } from '../../../persistence/repository.js';
import { MARK_ERRORS } from '../domain/errors.js';
import type { MarkDoc } from '../infrastructure/models.js';

/** Puerto hacia `sights`: el rango de la mira, para validar cada marca. */
export interface SightLookup {
  findOwned: (
    userId: string,
    id: string,
  ) => Promise<{ scaleMinMm: number; scaleMaxMm: number; status: string } | null>;
}

/** Puerto hacia `equipment`. */
export interface ArrowSetLookup {
  ownsArrowSet: (userId: string, id: string) => Promise<boolean>;
}

export interface MarkServiceDeps {
  marks: OwnedRepository<MarkDoc>;
  sights: SightLookup;
  equipment: ArrowSetLookup;
  now: () => Date;
}

export function createMarkService({ marks, sights, equipment, now }: MarkServiceDeps) {
  /** Trae la mira o corta con 404: no confirma que exista si no es tuya. */
  async function requireSight(userId: string, sightId: string) {
    const sight = await sights.findOwned(userId, sightId);
    if (!sight)
      throw appError({
        code: 'BS-SIGHT-404-001',
        status: 404,
        messageKey: 'errors.sight.notFound',
      });
    return sight;
  }

  /** La marca tiene que caer dentro de la escala de SU mira. */
  function assertInScale(value: number, sight: { scaleMinMm: number; scaleMaxMm: number }) {
    if (value < sight.scaleMinMm || value > sight.scaleMaxMm) {
      throw appError(MARK_ERRORS.outOfScale, {
        min: sight.scaleMinMm,
        max: sight.scaleMaxMm,
      });
    }
  }

  /**
   * Lista las marcas de una mira.
   *
   * 🔴 Verifica la mira **antes** de filtrar. Sin eso, pedir las marcas de una
   * mira borrada —o de la de otro arquero— devolvia `200 []` en vez de 404: no
   * filtraba datos, pero rompia la regla de que lo que no es tuyo no existe, y
   * un dia esa inconsistencia se convierte en una fuga.
   */
  async function listOf(userId: string, sightId: string, arrowSetId?: string): Promise<MarkDoc[]> {
    await requireSight(userId, sightId);

    const filter: Record<string, unknown> = { userId, sightId, ...VIVOS };
    if (arrowSetId) filter['arrowSetId'] = arrowSetId;
    const docs = await marks.model.find(filter).sort({ distanceM: 1 }).lean().exec();
    return docs as unknown as MarkDoc[];
  }

  return {
    list: listOf,

    async create(userId: string, sightId: string, data: MarkCreate): Promise<MarkDoc> {
      const sight = await requireSight(userId, sightId);
      if (sight.status === 'locked') {
        throw appError({
          code: 'BS-SIGHT-403-004',
          status: 403,
          messageKey: 'errors.sight.locked',
        });
      }

      if (!(await equipment.ownsArrowSet(userId, data.arrowSetId))) {
        throw appError({
          code: 'BS-EQUIP-404-001',
          status: 404,
          messageKey: 'errors.equipment.notFound',
        });
      }
      assertInScale(data.scaleValueMm, sight);

      // 🔴 Una distancia repetida es un conflicto **explicito**, no un duplicado
      // silencioso: el arquero decide si reemplaza la que ya tenia.
      const yaHay = await marks.model
        .countDocuments({
          userId,
          sightId,
          arrowSetId: data.arrowSetId,
          distanceM: data.distanceM,
          ...VIVOS,
        })
        .exec();
      if (yaHay > 0) {
        throw appError(MARK_ERRORS.duplicateDistance, { distanceM: data.distanceM });
      }

      return marks.create(userId, {
        ...(data as unknown as Record<string, unknown>),
        id: data.id,
        sightId,
      });
    },

    async update(userId: string, sightId: string, id: string, patch: MarkUpdate): Promise<MarkDoc> {
      const sight = await requireSight(userId, sightId);
      const actual = await marks.findOwned(userId, id);
      if (!actual || actual.sightId !== sightId) throw appError(MARK_ERRORS.notFound);

      /**
       * 🔴 Concurrencia optimista, **nunca** last-write-wins silencioso.
       *
       * El conflicto aca es casi siempre la misma persona en dos dispositivos,
       * asi que es raro — pero descartar sin avisar una marca medida hace diez
       * minutos en la linea de tiro es inaceptable (ADR-006).
       */
      if (patch.baseUpdatedAt) {
        // Temporal para parsear, no `Date`: es la regla del proyecto y aplica
        // igual a un dato que viene del cliente.
        const visto = Temporal.Instant.from(patch.baseUpdatedAt).epochMilliseconds;
        if (actual.updatedAt.getTime() > visto) {
          throw appError(MARK_ERRORS.staleWrite, {
            serverUpdatedAt: actual.updatedAt.toISOString(),
          });
        }
      }

      if (patch.scaleValueMm !== undefined) assertInScale(patch.scaleValueMm, sight);
      if (patch.arrowSetId && !(await equipment.ownsArrowSet(userId, patch.arrowSetId))) {
        throw appError({
          code: 'BS-EQUIP-404-001',
          status: 404,
          messageKey: 'errors.equipment.notFound',
        });
      }

      const { baseUpdatedAt: _ignored, ...cambios } = patch;
      const updated = await marks.update(userId, id, cambios as Record<string, unknown>);
      if (!updated) throw appError(MARK_ERRORS.notFound);
      return updated;
    },

    async remove(userId: string, sightId: string, id: string): Promise<void> {
      const actual = await marks.findOwned(userId, id);
      if (!actual || actual.sightId !== sightId) throw appError(MARK_ERRORS.notFound);
      await marks.softDelete(userId, id, now());
    },

    /**
     * La calculadora: cualquier distancia, con angulo opcional.
     *
     * 🔴 Corre el modelo de `@bow-sight/domain`, que **pasa exacto por las
     * marcas medidas** (ADR-001), e informa si el valor es interpolado o
     * estimado. Presentar una estimacion como una medicion seria mentir sobre lo
     * unico que nos diferencia.
     */
    async calculate(userId: string, sightId: string, query: MarkQuery) {
      const sight = await requireSight(userId, sightId);
      const medidas = await listOf(userId, sightId, query.arrowSetId);

      if (medidas.length < SIGHT_CALC_MIN_MARKS) {
        throw appError(MARK_ERRORS.notEnoughMarks, {
          have: medidas.length,
          need: SIGHT_CALC_MIN_MARKS,
        });
      }

      const points: SightPoint[] = medidas.map((m) => ({
        distance: m.distanceM,
        mark: m.scaleValueMm,
      }));
      const model = createSightModel(points);

      // Corte por angulo: la distancia que importa es la horizontal.
      const horizontal =
        query.angleDeg === undefined
          ? query.distanceM
          : query.distanceM * Math.cos((query.angleDeg * Math.PI) / 180);

      const { mark, interpolated } = model.markAt(horizontal);

      return {
        distanceM: query.distanceM,
        horizontalDistanceM: Number(horizontal.toFixed(2)),
        scaleValueMm: Number(mark.toFixed(1)),
        /** `false` => extrapolado. La UI lo muestra con `≈` y como estimado. */
        interpolated,
        /** Fuera de la escala fisica de la mira no hay a donde moverla. */
        withinScale: mark >= sight.scaleMinMm && mark <= sight.scaleMaxMm,
        fitQuality: Number(model.quad.maxAbsResidual.toFixed(2)),
        computed: computeSightMarks(
          model,
          medidas.map((m) => m.distanceM),
          { scaleMin: sight.scaleMinMm, scaleMax: sight.scaleMaxMm },
        ),
      };
    },
  };
}

export type MarkService = ReturnType<typeof createMarkService>;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StudentYear, Unit, UnitSelectionRole } from '../types';
import { adaptiveConfig } from '../../../shared/utils/adaptiveAttendanceConfig';
import {
  loadUnitMappings,
  loadSelectedUnitCodes,
  saveSelectedUnitCodes,
  saveUnitMappings,
} from '../../../shared/storage/unitMappings';
import { useAuth } from '../../auth/context/AuthContext';
import { API_BASE_URL } from '../../../shared/constants';
import { saveUnitStudents } from '../../../shared/storage/cachedUnitStudents';
import { normalizeUnitCode as normalizeCode } from '../../../shared/utils/unitCodes';
import {
  cacheUnitSelectionSnapshot,
  isUnitSelectionSnapshotFresh,
  readUnitSelectionSnapshot,
  runWithUnitSelectionFetchLock,
} from '../../../shared/storage/unitSelectionCache';

const storageKey = (role: UnitSelectionRole, userId?: string | null) =>
  `@markwise/${role}-unit-selection/${userId || 'anonymous'}/v1`;
const selectionInitializedKey = (
  role: UnitSelectionRole,
  userId?: string | null,
) => `@markwise/${role}-unit-selection/${userId || 'anonymous'}/initialized-v1`;

const cacheLecturerRosters = async (token: string, unitCodes: string[]) => {
  await Promise.all(
    unitCodes.map(async unitCode => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/lecturers/units/${encodeURIComponent(
            unitCode,
          )}/roster`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          students?: Array<{
            studentId?: string;
            studentName?: string;
            admissionNumber?: string;
          }>;
        };
        await saveUnitStudents(
          unitCode,
          (body.students || [])
            .filter(student => student.studentId && student.admissionNumber)
            .map(student => ({
              studentId: student.studentId!,
              studentName: student.studentName || 'Unnamed student',
              admissionNumber: student.admissionNumber!,
            })),
        );
      } catch {
        // Keep the previous roster if the device is offline.
      }
    }),
  );
};

export const useUnitSelection = (role: UnitSelectionRole, searchQuery = '') => {
  const { token, userId, institutionId } = useAuth();
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [catalogue, setCatalogue] = useState<Unit[]>([]);
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<string[]>([]);
  const [years, setYears] = useState<StudentYear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token || !userId) {
        setCatalogue([]);
        setYears([]);
        setSelectedCodes([]);
        setLoading(false);
        return;
      }

      const snapshot = await readUnitSelectionSnapshot({
        role,
        userId,
        institutionId,
      });
      const localCodes = await loadSelectedUnitCodes({
        userId,
        role,
        institutionId,
      }).catch(() => [] as string[]);
      const localMappings = await loadUnitMappings({
        userId,
        role,
        institutionId,
      }).catch(() => []);

      // Lecturer catalogues are institution-wide and searchable. A snapshot
      // may contain only an earlier search result, so never short-circuit the
      // lecturer fetch with it. The cached catalogue remains available while
      // the request is in flight or when offline.
      if (
        snapshot &&
        isUnitSelectionSnapshotFresh(snapshot) &&
        role !== 'lecturer'
      ) {
        if (!mounted) return;
        setCatalogue(snapshot.catalogue);
        setYears(snapshot.years);
        setEnrolledUnitIds(snapshot.enrolledUnitIds);
        setSelectedCodes(snapshot.selectedCodes);
        setLoading(false);
        await adaptiveConfig.initialize(
          role,
          snapshot.selectedCodes,
          institutionId,
          userId,
        );
        return;
      }

      const localMappingByCode = new Map(
        localMappings.map(unit => [normalizeCode(unit.unitCode), unit]),
      );
      const cachedCodes = localCodes.length
        ? localCodes
        : localMappings.map(unit => normalizeCode(unit.unitCode));
      const cachedUnits = cachedCodes.map(code => ({
        code,
        name: localMappingByCode.get(code)?.unitName || 'Saved teaching unit',
      }));

      let hasLocalSelection = localCodes.length > 0;
      if (
        !hasLocalSelection &&
        (await AsyncStorage.getItem(selectionInitializedKey(role, userId))) ===
          '1'
      )
        hasLocalSelection = true;

      if (cachedUnits.length && (!snapshot || role === 'lecturer')) {
        if (!mounted) return;
        setCatalogue(cachedUnits);
        setSelectedCodes(cachedCodes);
        setLoading(false);
      }

      await adaptiveConfig.initialize(role, localCodes, institutionId, userId);

      const query =
        role === 'lecturer' && searchQuery.trim()
          ? `?q=${encodeURIComponent(searchQuery.trim())}&limit=50`
          : '';

      const fetchCatalog = async () => {
        const response = await fetch(
          `${API_BASE_URL}/${
            role === 'student'
              ? 'students/units/catalog'
              : 'lecturers/units/catalog'
          }${query}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok)
          throw new Error(`Units request failed (${response.status})`);
        return response.json() as Promise<{
          units?: Array<{
            id?: string;
            code?: string;
            unitCode?: string;
            name?: string;
            unitName?: string;
            bleId?: string;
          }>;
          years?: Array<{
            yearNumber: number;
            semester: Array<{
              semesterNumber: number;
              name: string;
              units: Array<{ id?: string; code?: string; name?: string }>;
            }>;
          }>;
          enrolledUnitIds?: string[];
          selectedUnitIds?: string[];
        }>;
      };

      try {
        const unitsBody = await runWithUnitSelectionFetchLock(
          `${role}:${userId}:${institutionId || 'global'}:${searchQuery}`,
          fetchCatalog,
        );

        const catalogUnits: Array<{
          id?: string;
          code?: string;
          unitCode?: string;
          name?: string;
          unitName?: string;
          bleId?: string;
        }> =
          role === 'student'
            ? (unitsBody.years || []).flatMap(year =>
                year.semester.flatMap(semester => semester.units),
              )
            : unitsBody.units || [];

        if (role === 'student') {
          setYears(
            (unitsBody.years || []).map(year => ({
              yearNumber: year.yearNumber,
              semester: year.semester.map(semester => ({
                semesterNumber: semester.semesterNumber,
                name: semester.name,
                units: semester.units.map(unit => ({
                  id: unit.id,
                  code: normalizeCode(unit.code || ''),
                  name: unit.name || 'Unnamed unit',
                })),
              })),
            })),
          );
        } else {
          setYears([]);
        }

        const remoteUnits = catalogUnits
          .map(unit => ({
            id: unit.id,
            code: normalizeCode(unit.code || unit.unitCode || ''),
            name: unit.name || unit.unitName || 'Unnamed unit',
            bleId: String(unit.bleId || '').trim(),
          }))
          .filter(unit => unit.code);

        if (!mounted) return;
        setCatalogue(remoteUnits);

        const catalogMappings = remoteUnits
          .filter(unit => /^\d{4}$/.test(unit.bleId))
          .map(unit => ({
            unitCode: unit.code,
            unitName: unit.name,
            bleId: unit.bleId,
          }));
        if (catalogMappings.length)
          await saveUnitMappings(
            { userId: userId || '', role, institutionId },
            catalogMappings,
          );

        const remoteEnrolledIds =
          role === 'student'
            ? unitsBody.enrolledUnitIds || []
            : unitsBody.selectedUnitIds || [];
        setEnrolledUnitIds(remoteEnrolledIds);

        const storedCodes = await loadSelectedUnitCodes({
          userId: userId || '',
          role,
          institutionId,
        });
        if (!mounted) return;

        const remoteCodes = new Set(remoteUnits.map(unit => unit.code));
        let codes = storedCodes
          .map(normalizeCode)
          .filter(code => remoteCodes.has(code));

        if (!codes.length) {
          const value = await AsyncStorage.getItem(storageKey(role, userId));
          if (value) {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
              codes = parsed
                .map(String)
                .map(normalizeCode)
                .filter(code => remoteCodes.has(code));
            if (codes.length) {
              hasLocalSelection = true;
              await saveSelectedUnitCodes(
                { userId: userId || '', role, institutionId },
                codes,
              );
              await AsyncStorage.removeItem(storageKey(role, userId));
            }
          }
        }

        if (role === 'student' && !codes.length && !hasLocalSelection)
          codes = remoteUnits
            .filter(unit => unit.id && remoteEnrolledIds.includes(unit.id))
            .map(unit => unit.code);
        if (role === 'lecturer' && !codes.length && !hasLocalSelection)
          codes = remoteUnits
            .filter(unit => unit.id && remoteEnrolledIds.includes(unit.id))
            .map(unit => unit.code);

        setSelectedCodes(codes);
        if (codes.length)
          await saveSelectedUnitCodes(
            { userId: userId || '', role, institutionId },
            codes,
          );

        await cacheUnitSelectionSnapshot({
          role,
          userId,
          institutionId,
          selectedCodes: codes,
          catalogue: remoteUnits,
          enrolledUnitIds: remoteEnrolledIds,
          years:
            role === 'student'
              ? (unitsBody.years || []).map(year => ({
                  yearNumber: year.yearNumber,
                  semester: year.semester.map(semester => ({
                    semesterNumber: semester.semesterNumber,
                    name: semester.name,
                    units: semester.units.map(unit => ({
                      id: unit.id,
                      code: normalizeCode(unit.code || ''),
                      name: unit.name || 'Unnamed unit',
                    })),
                  })),
                }))
              : [],
        });

        await adaptiveConfig.initialize(role, codes, institutionId, userId);
        await adaptiveConfig
          .syncSelectedUnits(token, codes, userId)
          .catch(() => undefined);

        if (role === 'lecturer' && codes.length) {
          await Promise.all(
            codes.map(async unitCode => {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/lecturers/units/${encodeURIComponent(
                    unitCode,
                  )}/roster`,
                  {
                    headers: {
                      Accept: 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  },
                );
                if (!response.ok) return;
                const body = (await response.json()) as {
                  students?: Array<{
                    studentId?: string;
                    studentName?: string;
                    admissionNumber?: string;
                  }>;
                };
                const students = (body.students || [])
                  .filter(student => student.studentId && student.admissionNumber)
                  .map(student => ({
                    studentId: student.studentId!,
                    studentName: student.studentName || 'Unnamed student',
                    admissionNumber: student.admissionNumber!,
                  }));
                await saveUnitStudents(unitCode, students);
              } catch {
                // Existing roster remains available for offline attendance.
              }
            }),
          );
        }
      } catch {
        // Keep the app usable offline and avoid multiple API retries while
        // the user is already on the unit-selection flow.
        if (!mounted) return;
        setCatalogue(cachedUnits);
        setYears([]);
        setEnrolledUnitIds([]);
        setSelectedCodes(cachedCodes);
        await adaptiveConfig.initialize(
          role,
          cachedCodes,
          institutionId,
          userId,
        );
        return;
      }
    };

    load()
      .then(() => {
        if (!mounted) return;
        setLoading(false);
      })
      .catch(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [role, token, userId, institutionId, searchQuery]);

  const persist = useCallback(
    async (codes: string[]) => {
      const normalized = [...new Set(codes.map(normalizeCode).filter(Boolean))];
      // Save first. The local database is the offline source of truth; the
      // API sync below can be retried on a later online session.
      await saveSelectedUnitCodes(
        { userId: userId || '', role, institutionId },
        normalized,
      );
      await AsyncStorage.setItem(selectionInitializedKey(role, userId), '1');
      setSelectedCodes(normalized);

      if (role === 'student' && token && userId) {
        // Get unit IDs for selected codes
        const selectedUnitIds = normalized
          .map(code => catalogue.find(unit => unit.code === code)?.id)
          .filter((id): id is string => Boolean(id));
        
        const selectedIdsSet = new Set(selectedUnitIds);
        
        // Find units to UNENROLL (in enrolledUnitIds but not in selectedUnitIds)
        const unitsToRemove = enrolledUnitIds.filter(id => !selectedIdsSet.has(id));
        
        // Find units to ENROLL (in selectedUnitIds but not in enrolledUnitIds)
        const unitsToAdd = selectedUnitIds.filter(id => !enrolledUnitIds.includes(id));
        
        // Remove unenrolled units
        if (unitsToRemove.length > 0) {
          await Promise.all(
            unitsToRemove.map(async unitId => {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/students/units/${encodeURIComponent(unitId)}`,
                  {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );
                if (response.ok) {
                  setEnrolledUnitIds(current =>
                    current.filter(id => id !== unitId),
                  );
                } else {
                  console.warn(
                    `Failed to unenroll unit ${unitId} (${response.status})`,
                  );
                }
              } catch (error) {
                console.warn(`Unit removal will be retried when online:`, error);
              }
            }),
          );
        }
        
        // Enroll new units
        if (unitsToAdd.length > 0) {
          try {
            const response = await fetch(
              `${API_BASE_URL}/students/units/enroll`,
              {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ unitIds: unitsToAdd }),
              },
            );
            if (response.ok) {
              setEnrolledUnitIds(current => [
                ...new Set([...current, ...unitsToAdd]),
              ]);
            } else {
              console.warn(`Failed to enroll units (${response.status})`);
            }
          } catch (error) {
            console.warn(`Unit enrollment will be retried when online:`, error);
          }
        }
      }

      if (role === 'lecturer' && token && userId) {
        const unitIds = normalized
          .map(code => catalogue.find(unit => unit.code === code)?.id)
          .filter((id): id is string => Boolean(id));
        const response = await fetch(`${API_BASE_URL}/lecturers/units`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ unitIds }),
        });
        if (!response.ok)
          console.warn(`Failed to sync teaching units (${response.status})`);
        await cacheLecturerRosters(token, normalized);
      }
      
      await adaptiveConfig.setSelectedUnits(
        role,
        normalized,
        userId || '',
        institutionId,
      );
      if (token && userId) {
        await adaptiveConfig
          .syncSelectedUnits(token, normalized, userId)
          .catch(() => undefined);
      }
    },
    [catalogue, enrolledUnitIds, institutionId, role, token, userId],
  );

  const toggleUnit = useCallback(
    (unit: Unit) => {
      const code = normalizeCode(unit.code);
      const next = selectedCodes.includes(code)
        ? selectedCodes.filter(item => item !== code)
        : [...selectedCodes, code];
      void persist(next);
    },
    [persist, selectedCodes],
  );

  const selectUnit = useCallback(
    async (unit: Unit) => {
      await persist([unit.code]);
    },
    [persist],
  );

  const selectUnitLocally = useCallback(
    async (unit: Unit) => {
      const normalized = normalizeCode(unit.code);
      setSelectedCodes([normalized]);
      await saveSelectedUnitCodes(
        { userId: userId || '', role, institutionId },
        [normalized],
      );
      await adaptiveConfig.setSelectedUnits(
        role,
        [normalized],
        userId || '',
        institutionId,
      );
      if (token && userId)
        await adaptiveConfig
          .syncSelectedUnits(token, [normalized], userId)
          .catch(() => undefined);
      if (role === 'lecturer' && token)
        await cacheLecturerRosters(token, [normalized]);
    },
    [institutionId, role, token, userId],
  );

  const addUnitCode = useCallback(
    async (code: string) => {
      const normalized = normalizeCode(code);
      if (!normalized) return;
      await persist([...selectedCodes, normalized]);
    },
    [persist, selectedCodes],
  );

  const availableUnits = useMemo(() => [...catalogue], [catalogue]);

  const selectedUnits = useMemo(
    () =>
      selectedCodes.map(
        code =>
          catalogue.find(unit => unit.code === code) ?? {
            code,
            name: 'Unknown unit',
          },
      ),
    [catalogue, selectedCodes],
  );

  return {
    availableUnits,
    years,
    selectedCodes,
    selectedUnits,
    selectedUnit: selectedUnits[0],
    loading,
    toggleUnit,
    selectUnit,
    selectUnitLocally,
    addUnitCode,
  };
};

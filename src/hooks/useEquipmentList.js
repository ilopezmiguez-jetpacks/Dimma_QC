import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const PAGE_SIZE = 12;

export const useEquipmentList = ({ labId }) => {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filtersRef = useRef({ searchTerm: '', statusFilter: 'all' });

  const buildQuery = useCallback((cursorParam, filters) => {
    let q = supabase
      .from('equipment')
      .select(`
        id, name, model, serial, status,
        maintenance_due, daily_deviation_threshold,
        equipment_type_id, laboratory_id, created_at,
        laboratory:laboratories(name),
        type:equipment_types(name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    if (labId && labId !== 'all') {
      q = q.eq('laboratory_id', labId);
    }

    if (filters.statusFilter === 'ok') {
      q = q.eq('status', 'ok');
    } else if (filters.statusFilter === 'issue') {
      q = q.in('status', ['warning', 'error']);
    } else if (filters.statusFilter === 'maintenance') {
      q = q.lt('maintenance_due', new Date().toISOString());
    }

    if (filters.searchTerm) {
      q = q.or(`name.ilike.%${filters.searchTerm}%,model.ilike.%${filters.searchTerm}%`);
    }

    if (cursorParam) {
      q = q.or(
        `created_at.gt.${cursorParam.created_at},and(created_at.eq.${cursorParam.created_at},id.gt.${cursorParam.id})`
      );
    }

    return q;
  }, [labId]);

  const transform = (eq) => ({
    ...eq,
    maintenanceDue: eq.maintenance_due,
    dailyDeviationThreshold: eq.daily_deviation_threshold,
    laboratoryName: eq.laboratory?.name,
    typeName: eq.type?.name,
    lots: [],
  });

  const fetchPage = useCallback(async (cursorParam = null, append = false, filters = filtersRef.current) => {
    filtersRef.current = filters;
    if (!append) setLoading(true);
    else setIsLoadingMore(true);

    const { data, error } = await buildQuery(cursorParam, filters);

    if (!error && data) {
      const page = data.map(transform);
      setItems(prev => append ? [...prev, ...page] : page);

      const newCursor = page.length === PAGE_SIZE
        ? { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id }
        : null;
      setCursor(newCursor);
      setHasMore(page.length === PAGE_SIZE);
    }

    if (!append) setLoading(false);
    else setIsLoadingMore(false);
  }, [buildQuery]);

  const reset = useCallback((filters) => {
    setCursor(null);
    setItems([]);
    fetchPage(null, false, filters);
  }, [fetchPage]);

  const loadMore = useCallback((filters) => {
    fetchPage(cursor, true, filters);
  }, [cursor, fetchPage]);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(eq => eq.id !== id));
  }, []);

  return { items, cursor, hasMore, loading, isLoadingMore, reset, loadMore, removeItem };
};

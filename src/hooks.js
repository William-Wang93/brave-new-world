import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── AUTH ───
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signIn, signOut };
}

// ─── ENTRIES ───
export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setEntries(data);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (entry) => {
    // Upsert: insert or update based on id
    const { data, error } = await supabase
      .from('entries')
      .upsert(entry, { onConflict: 'id' })
      .select()
      .single();
    if (!error && data) {
      setEntries(prev => {
        const i = prev.findIndex(e => e.id === data.id);
        if (i >= 0) { const n = [...prev]; n[i] = data; return n; }
        return [data, ...prev];
      });
    }
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (!error) setEntries(prev => prev.filter(e => e.id !== id));
    return { error };
  };

  return { entries, loaded, save, remove, reload: load };
}

// ─── SIGNALS ───
export function useSignals() {
  const [signals, setSignals] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setSignals(data);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (signal) => {
    const { data, error } = await supabase
      .from('signals')
      .insert(signal)
      .select()
      .single();
    if (!error && data) setSignals(prev => [data, ...prev]);
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from('signals').delete().eq('id', id);
    if (!error) setSignals(prev => prev.filter(s => s.id !== id));
    return { error };
  };

  return { signals, loaded, add, remove, reload: load };
}

// ─── MILESTONES ───
export function useMilestones() {
  const [completedMs, setCompletedMs] = useState({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('milestones')
      .select('*');
    if (!error && data) {
      const map = {};
      data.forEach(row => { map[row.node_id] = row.completed; });
      setCompletedMs(map);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (nodeId, idx) => {
    setCompletedMs(prev => {
      const current = prev[nodeId] || [];
      const next = [...current];
      next[idx] = !next[idx];
      const updated = { ...prev, [nodeId]: next };
      // Persist to Supabase
      supabase.from('milestones')
        .upsert({ node_id: nodeId, completed: next }, { onConflict: 'node_id' })
        .then(() => {});
      return updated;
    });
  };

  return { completedMs, loaded, toggle, reload: load };
}

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { search, searchLastfm, getSuggestions, Track, LastfmSearchResult } from '../services/api';

export type SearchSource = 'youtube' | 'lastfm';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [source, setSource] = useState<SearchSource>('lastfm');
  const timerRef = { current: 0 as ReturnType<typeof setTimeout> };

  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(q), 300);
  }, []);

  const { data: ytResults = [], isLoading: ytLoading } = useQuery<Track[]>({
    queryKey: ['search', debouncedQuery, filter],
    queryFn: () => search(debouncedQuery, filter),
    enabled: debouncedQuery.length > 1 && source === 'youtube',
  });

  const { data: lfmResults = [], isLoading: lfmLoading } = useQuery<LastfmSearchResult[]>({
    queryKey: ['search-lastfm', debouncedQuery],
    queryFn: () => searchLastfm(debouncedQuery),
    enabled: debouncedQuery.length > 1 && source === 'lastfm',
  });

  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['suggestions', debouncedQuery],
    queryFn: () => getSuggestions(debouncedQuery),
    enabled: debouncedQuery.length > 0 && ytResults.length === 0 && lfmResults.length === 0,
  });

  const isLoading = source === 'youtube' ? ytLoading : lfmLoading;
  const results = source === 'youtube' ? ytResults : [];
  const lastfmResults = source === 'lastfm' ? lfmResults : [];

  return {
    query, setQuery: updateQuery,
    results, lastfmResults,
    isLoading, suggestions,
    filter, setFilter,
    source, setSource,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

interface SearchHistory {
  id: string;
  query: string;
  filters: any;
  timestamp: Date;
  resultsCount: number;
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'league' | 'position' | 'location' | 'team' | 'player' | 'query';
  count?: number;
}

export const useAdvancedSearch = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([]);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);

  // Load data from storage on mount
  useEffect(() => {
    const history = storage.getItem('searchHistory');
    const filters = storage.getItem('savedFilters');
    
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }

    if (filters) {
      try {
        setSavedFilters(JSON.parse(filters));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }

    // Load popular searches (in real app, this would come from API)
    setPopularSearches([
      { id: '1', text: 'Premier League', type: 'league', count: 45 },
      { id: '2', text: 'Striker', type: 'position', count: 32 },
      { id: '3', text: 'Under 16', type: 'league', count: 28 },
      { id: '4', text: 'London', type: 'location', count: 56 },
      { id: '5', text: 'Midfielder', type: 'position', count: 41 },
    ]);
  }, []);

  // Save search history to storage
  const saveSearchHistory = useCallback((history: SearchHistory[]) => {
    storage.setItem('searchHistory', JSON.stringify(history));
    setSearchHistory(history);
  }, []);

  // Add search to history
  const addToHistory = useCallback((query: string, filters: any, resultsCount: number) => {
    const newSearch: SearchHistory = {
      id: Date.now().toString(),
      query,
      filters,
      timestamp: new Date(),
      resultsCount
    };

    setSearchHistory(prev => {
      // Remove duplicate searches
      const filtered = prev.filter(item => 
        !(item.query === query && JSON.stringify(item.filters) === JSON.stringify(filters))
      );
      
      // Add new search at the beginning and limit to 20 items
      const updated = [newSearch, ...filtered].slice(0, 20);
      saveSearchHistory(updated);
      return updated;
    });
  }, [saveSearchHistory]);

  // Clear search history
  const clearHistory = useCallback(() => {
    storage.removeItem('searchHistory');
    setSearchHistory([]);
  }, []);

  // Save filter preset
  const saveFilterPreset = useCallback((name: string, filters: any) => {
    const preset = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date()
    };

    setSavedFilters(prev => {
      const updated = [preset, ...prev].slice(0, 10); // Limit to 10 presets
      storage.setItem('savedFilters', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Delete filter preset
  const deleteFilterPreset = useCallback((id: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(preset => preset.id !== id);
      storage.setItem('savedFilters', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Generate suggestions based on input
  const generateSuggestions = useCallback((input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }

    const inputLower = input.toLowerCase();
    
    // Combine different suggestion sources
    const allSuggestions = [
      // From search history
      ...searchHistory
        .filter(item => item.query.toLowerCase().includes(inputLower))
        .map(item => ({
          id: `history-${item.id}`,
          text: item.query,
          type: 'query' as const,
          count: item.resultsCount
        })),
      
      // From popular searches
      ...popularSearches
        .filter(item => item.text.toLowerCase().includes(inputLower))
        .slice(0, 5),
      
      // Static suggestions (in real app, from API)
      ...[
        { id: 'pos-striker', text: 'Striker', type: 'position' as const },
        { id: 'pos-midfielder', text: 'Midfielder', type: 'position' as const },
        { id: 'pos-defender', text: 'Defender', type: 'position' as const },
        { id: 'pos-goalkeeper', text: 'Goalkeeper', type: 'position' as const },
        { id: 'league-premier', text: 'Premier League', type: 'league' as const },
        { id: 'league-championship', text: 'Championship', type: 'league' as const },
        { id: 'loc-london', text: 'London', type: 'location' as const },
        { id: 'loc-manchester', text: 'Manchester', type: 'location' as const },
        { id: 'loc-birmingham', text: 'Birmingham', type: 'location' as const },
      ]
        .filter(item => item.text.toLowerCase().includes(inputLower))
        .slice(0, 3)
    ];

    // Remove duplicates and limit results
    const uniqueSuggestions = allSuggestions
      .filter((item, index, self) => 
        index === self.findIndex(s => s.text === item.text)
      )
      .slice(0, 8);

    setSuggestions(uniqueSuggestions);
  }, [searchHistory, popularSearches]);

  // Get smart filters based on current search
  const getSmartFilters = useCallback((query: string) => {
    // In a real app, this would analyze the query and suggest relevant filters
    const smartFilters = [];
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('striker') || queryLower.includes('forward')) {
      smartFilters.push({
        type: 'position',
        value: 'Forward',
        label: 'Add Forward position filter'
      });
    }
    
    if (queryLower.includes('london')) {
      smartFilters.push({
        type: 'location',
        value: 'London',
        label: 'Filter by London area'
      });
    }
    
    if (queryLower.includes('under')) {
      const ageMatch = queryLower.match(/under (\d+)/);
      if (ageMatch) {
        smartFilters.push({
          type: 'ageGroup',
          value: `Under ${ageMatch[1]}`,
          label: `Filter by Under ${ageMatch[1]} age group`
        });
      }
    }

    return smartFilters;
  }, []);

  return {
    searchHistory,
    suggestions,
    popularSearches,
    savedFilters,
    addToHistory,
    clearHistory,
    saveFilterPreset,
    deleteFilterPreset,
    generateSuggestions,
    getSmartFilters
  };
};
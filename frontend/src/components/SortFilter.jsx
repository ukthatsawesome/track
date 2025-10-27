import React, { useState, useCallback } from 'react';

export const sortData = (items, criteria, order) => {
  if (!items || items.length === 0) return items;

  return [...items].sort((a, b) => {
    let comparison = 0;

    if (criteria === 'alphabetical') {
      const aValue = (a.name || a.title || a.batch || '').toString().toLowerCase();
      const bValue = (b.name || b.title || b.batch || '').toString().toLowerCase();
      comparison = aValue.localeCompare(bValue);
    } else if (criteria === 'creationDate') {
      const parseDate = (d) => (d ? new Date(d).getTime() : 0);
      const aDate = parseDate(a.created_at || a.date_created);
      const bDate = parseDate(b.created_at || b.date_created);
      comparison = aDate - bDate;
    }

    return order === 'asc' ? comparison : -comparison;
  });
};

const SortFilter = ({ sortConfig, onSortChange }) => {
  const { sortBy, sortOrder } = sortConfig;

 
  const handleSort = useCallback(
    (criteria) => {
      const newSortOrder =
        sortBy === criteria && sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange({ sortBy: criteria, sortOrder: newSortOrder });
    },
    [sortBy, sortOrder, onSortChange]
  );

 
  const clearSort = useCallback(() => {
    onSortChange({ sortBy: null, sortOrder: 'asc' });
  }, [onSortChange]);

  return (
    <div className="sort-filter-container">
      <button
        onClick={() => handleSort('alphabetical')}
        className={sortBy === 'alphabetical' ? 'active' : ''}
      >
        Sort by Name {sortBy === 'alphabetical' && (sortOrder === 'asc' ? '▲' : '▼')}
      </button>

      <button
        onClick={() => handleSort('creationDate')}
        className={sortBy === 'creationDate' ? 'active' : ''}
      >
        Sort by Date {sortBy === 'creationDate' && (sortOrder === 'asc' ? '▲' : '▼')}
      </button>

      {sortBy && (
        <button onClick={clearSort} className="clear-sort">
          Clear Sort
        </button>
      )}
    </div>
  );
};

export default SortFilter;

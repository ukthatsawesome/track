import React from 'react';

const SearchFilter = ({ searchTerm, onSearchChange, placeholder = "Search..." }) => {
  return (
    <div className="search-filter-container">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
    </div>
  );
};

export default SearchFilter;
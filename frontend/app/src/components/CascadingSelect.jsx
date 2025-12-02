import { useState, useEffect } from 'react';

const CascadingSelect = ({ 
  regions, 
  neighborhoods,
  selectedRegion,
  selectedCity,
  selectedNeighborhood,
  onRegionChange,
  onCityChange,
  onNeighborhoodChange,
  disabled = false 
}) => {
  const [cities, setCities] = useState([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState([]);

  useEffect(() => {
    if (selectedRegion && regions) {
      const region = regions.find(r => r.name === selectedRegion);
      setCities(region?.cities || []);
    } else {
      setCities([]);
    }
  }, [selectedRegion, regions]);

  useEffect(() => {
    if (selectedCity && neighborhoods) {
      setAvailableNeighborhoods(neighborhoods[selectedCity] || []);
    } else {
      setAvailableNeighborhoods([]);
    }
  }, [selectedCity, neighborhoods]);

  return (
    <div className="cascading-select">
      <div className="select-group">
        <label>المنطقة</label>
        <select 
          value={selectedRegion || ''} 
          onChange={(e) => {
            onRegionChange(e.target.value);
            onCityChange('');
            onNeighborhoodChange('');
          }}
          disabled={disabled}
        >
          <option value="">اختر المنطقة</option>
          {regions?.map(region => (
            <option key={region.id} value={region.name}>
              {region.name}
            </option>
          ))}
        </select>
      </div>

      <div className="select-group">
        <label>المدينة</label>
        <select 
          value={selectedCity || ''} 
          onChange={(e) => {
            onCityChange(e.target.value);
            onNeighborhoodChange('');
          }}
          disabled={disabled || !selectedRegion}
        >
          <option value="">اختر المدينة</option>
          {cities.map(city => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className="select-group">
        <label>الحي</label>
        <select 
          value={selectedNeighborhood || ''} 
          onChange={(e) => onNeighborhoodChange(e.target.value)}
          disabled={disabled || !selectedCity}
        >
          <option value="">اختر الحي</option>
          {availableNeighborhoods.map(neighborhood => (
            <option key={neighborhood} value={neighborhood}>
              {neighborhood}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CascadingSelect;

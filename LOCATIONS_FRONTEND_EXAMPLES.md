# 🎨 أمثلة استخدام نظام المواقع في Frontend

## React/Next.js Examples

### 1. Component للاختيار من قائمة المدن والأحياء

```tsx
'use client'

import { useState, useEffect } from 'react'

interface Location {
  _id: string
  name_ar: string
  name_en: string
  level: string
}

export function LocationSelector({ onSelect }: { onSelect: (locationId: string) => void }) {
  const [cities, setCities] = useState<Location[]>([])
  const [districts, setDistricts] = useState<Location[]>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [loading, setLoading] = useState(false)

  // Load cities on mount
  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/api/locations/cities`)
      const data = await res.json()
      if (data.success) {
        setCities(data.data)
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDistricts = async (cityId: string) => {
    try {
      setLoading(true)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/matches/api/locations/cities/${cityId}/districts`
      )
      const data = await res.json()
      if (data.success) {
        setDistricts(data.data)
      }
    } catch (error) {
      console.error('Error fetching districts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId)
    setSelectedDistrict('')
    setDistricts([])
    if (cityId) {
      fetchDistricts(cityId)
    }
  }

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId)
    onSelect(districtId)
  }

  return (
    <div className="space-y-4">
      {/* City Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          المدينة *
        </label>
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="">اختر المدينة</option>
          {cities.map((city) => (
            <option key={city._id} value={city._id}>
              {city.name_ar}
            </option>
          ))}
        </select>
      </div>

      {/* District Selector */}
      {selectedCity && (
        <div>
          <label className="block text-sm font-medium mb-2">
            الحي / المنطقة
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={loading || districts.length === 0}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">اختر الحي</option>
            {districts.map((district) => (
              <option key={district._id} value={district._id}>
                {district.name_ar}
              </option>
            ))}
          </select>
          {districts.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-1">
              لا توجد أحياء متوفرة لهذه المدينة
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-gray-500">
          جاري التحميل...
        </div>
      )}
    </div>
  )
}
```

### 2. استخدام المكون في نموذج إنشاء مباراة

```tsx
'use client'

import { useState } from 'react'
import { LocationSelector } from './LocationSelector'
import { toast } from 'sonner'

export function CreateMatchForm() {
  const [formData, setFormData] = useState({
    title: '',
    sport: 'Football',
    location_id: '',
    date: '',
    time: '',
    level: 'intermediate',
    max_players: 14
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/api/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        toast.success('تم إنشاء المباراة بنجاح!')
        // Reset form or redirect
      } else {
        toast.error(data.message || 'حدث خطأ')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('حدث خطأ في الاتصال')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          عنوان المباراة *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Sport */}
      <div>
        <label className="block text-sm font-medium mb-2">
          الرياضة *
        </label>
        <select
          value={formData.sport}
          onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="Football">كرة القدم</option>
          <option value="Basketball">كرة السلة</option>
          <option value="Volleyball">كرة الطائرة</option>
          <option value="Tennis">التنس</option>
        </select>
      </div>

      {/* Location Selector */}
      <LocationSelector
        onSelect={(locationId) => setFormData({ ...formData, location_id: locationId })}
      />

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            التاريخ *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            الوقت *
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Level */}
      <div>
        <label className="block text-sm font-medium mb-2">
          المستوى *
        </label>
        <select
          value={formData.level}
          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="beginner">مبتدئ</option>
          <option value="intermediate">متوسط</option>
          <option value="advanced">محترف</option>
        </select>
      </div>

      {/* Max Players */}
      <div>
        <label className="block text-sm font-medium mb-2">
          عدد اللاعبين *
        </label>
        <input
          type="number"
          value={formData.max_players}
          onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
          min="2"
          max="100"
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
      >
        إنشاء المباراة
      </button>
    </form>
  )
}
```

### 3. Search Component مع Autocomplete

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

interface Location {
  _id: string
  name_ar: string
  name_en: string
  level: string
}

export function LocationSearch({ onSelect }: { onSelect: (location: Location) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const debounce = setTimeout(() => {
      searchLocations(query)
    }, 300)

    return () => clearTimeout(debounce)
  }, [query])

  const searchLocations = async (q: string) => {
    try {
      setLoading(true)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/matches/api/locations/search?q=${encodeURIComponent(q)}`
      )
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error searching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (location: Location) => {
    setQuery(location.name_ar)
    setShowResults(false)
    onSelect(location)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="ابحث عن مدينة أو منطقة..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((location) => (
            <button
              key={location._id}
              onClick={() => handleSelect(location)}
              className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center justify-between"
            >
              <span>{location.name_ar}</span>
              <span className="text-sm text-gray-500">
                {location.level === 'city' ? 'مدينة' : 'حي'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
          جاري البحث...
        </div>
      )}

      {/* No Results */}
      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
          لا توجد نتائج
        </div>
      )}
    </div>
  )
}
```

---

## Vanilla JavaScript / HTML Examples

### 1. Simple City Selector

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>اختيار المدينة</title>
    <style>
        select, input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div style="max-width: 500px; margin: 50px auto;">
        <h2>إنشاء مباراة</h2>
        
        <label>المدينة:</label>
        <select id="citySelect" onchange="loadDistricts()">
            <option value="">اختر المدينة</option>
        </select>

        <label>الحي:</label>
        <select id="districtSelect">
            <option value="">اختر الحي</option>
        </select>

        <label>عنوان المباراة:</label>
        <input type="text" id="title" placeholder="مباراة الجمعة">

        <button onclick="createMatch()" style="background: #0066cc; color: white; padding: 15px; cursor: pointer;">
            إنشاء المباراة
        </button>
    </div>

    <script>
        const API_URL = 'http://localhost:4000';

        // Load cities on page load
        async function loadCities() {
            try {
                const res = await fetch(`${API_URL}/matches/api/locations/cities`);
                const data = await res.json();
                
                const select = document.getElementById('citySelect');
                data.data.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city._id;
                    option.textContent = city.name_ar;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading cities:', error);
                alert('خطأ في تحميل المدن');
            }
        }

        // Load districts when city selected
        async function loadDistricts() {
            const cityId = document.getElementById('citySelect').value;
            const select = document.getElementById('districtSelect');
            
            // Clear previous districts
            select.innerHTML = '<option value="">اختر الحي</option>';
            
            if (!cityId) return;

            try {
                const res = await fetch(`${API_URL}/matches/api/locations/cities/${cityId}/districts`);
                const data = await res.json();
                
                data.data.forEach(district => {
                    const option = document.createElement('option');
                    option.value = district._id;
                    option.textContent = district.name_ar;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading districts:', error);
            }
        }

        // Create match
        async function createMatch() {
            const locationId = document.getElementById('districtSelect').value || 
                              document.getElementById('citySelect').value;
            const title = document.getElementById('title').value;

            if (!locationId || !title) {
                alert('يرجى ملء جميع الحقول');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/matches/api/matches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        title,
                        sport: 'Football',
                        location_id: locationId,
                        date: '2026-01-20',
                        time: '18:00',
                        level: 'intermediate',
                        max_players: 14
                    })
                });

                const data = await res.json();

                if (data.success) {
                    alert('تم إنشاء المباراة بنجاح!');
                } else {
                    alert('خطأ: ' + data.message);
                }
            } catch (error) {
                console.error('Error creating match:', error);
                alert('حدث خطأ');
            }
        }

        // Load cities on page load
        loadCities();
    </script>
</body>
</html>
```

### 2. Search with Autocomplete

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>البحث عن المواقع</title>
    <style>
        .search-container {
            position: relative;
            max-width: 500px;
            margin: 50px auto;
        }
        #searchInput {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        #results {
            position: absolute;
            width: 100%;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-top: 5px;
            max-height: 300px;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: none;
        }
        .result-item {
            padding: 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        .result-item:hover {
            background: #f5f5f5;
        }
        .result-name {
            font-weight: bold;
        }
        .result-type {
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="search-container">
        <h2>البحث عن مدينة أو منطقة</h2>
        <input 
            type="text" 
            id="searchInput" 
            placeholder="ابحث عن مدينة أو حي..."
            oninput="searchLocations()"
        >
        <div id="results"></div>
        <div id="selected" style="margin-top: 20px;"></div>
    </div>

    <script>
        const API_URL = 'http://localhost:4000';
        let debounceTimer;

        async function searchLocations() {
            const query = document.getElementById('searchInput').value;
            const resultsDiv = document.getElementById('results');

            // Clear previous results if query is too short
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }

            // Debounce search
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(
                        `${API_URL}/matches/api/locations/search?q=${encodeURIComponent(query)}`
                    );
                    const data = await res.json();

                    if (data.success && data.data.length > 0) {
                        displayResults(data.data);
                    } else {
                        resultsDiv.innerHTML = '<div class="result-item">لا توجد نتائج</div>';
                        resultsDiv.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error searching:', error);
                }
            }, 300);
        }

        function displayResults(locations) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';

            locations.forEach(location => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.onclick = () => selectLocation(location);
                
                const levelText = {
                    'city': 'مدينة',
                    'district': 'حي',
                    'region': 'منطقة'
                }[location.level] || location.level;

                div.innerHTML = `
                    <div class="result-name">${location.name_ar}</div>
                    <div class="result-type">${levelText}</div>
                `;
                
                resultsDiv.appendChild(div);
            });

            resultsDiv.style.display = 'block';
        }

        function selectLocation(location) {
            document.getElementById('searchInput').value = location.name_ar;
            document.getElementById('results').style.display = 'none';
            
            const selectedDiv = document.getElementById('selected');
            selectedDiv.innerHTML = `
                <div style="padding: 15px; background: #e3f2fd; border-radius: 8px;">
                    <strong>تم اختيار:</strong> ${location.name_ar}<br>
                    <small>ID: ${location._id}</small>
                </div>
            `;
        }

        // Hide results when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-container')) {
                document.getElementById('results').style.display = 'none';
            }
        });
    </script>
</body>
</html>
```

---

## Quick Reference

### API Endpoints

```javascript
// Get all cities
GET /matches/api/locations/cities

// Get districts for a city
GET /matches/api/locations/cities/{cityId}/districts

// Search locations
GET /matches/api/locations/search?q=الرياض

// Get location details
GET /matches/api/locations/{locationId}
```

### Create Match with Location

```javascript
POST /matches/api/matches
{
  "title": "Match Title",
  "sport": "Football",
  "location_id": "LOCATION_ID",  // From location selector
  "date": "2026-01-20",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14
}
```

---

**تاريخ الإنشاء**: يناير 2026  
**الحالة**: ✅ جاهز للاستخدام



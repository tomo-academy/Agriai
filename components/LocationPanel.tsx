import React, { useEffect, useState, useRef } from 'react';
import { WeatherData, RegionAnalysis, Language } from '../types';
import { fetchLocalWeather, getWeatherDescription } from '../services/weatherService';
import { analyzeRegion } from '../services/geminiService';
import { CloudRain, Sun, Droplets, MapPin, AlertTriangle, Loader2, Moon, CloudFog, CloudLightning, Snowflake, Satellite, Locate } from 'lucide-react';
import { getTranslation } from '../utils/translations';

// Declare L for Leaflet as it is loaded via script tag
declare const L: any;

interface LocationPanelProps {
  lang: Language;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({ lang }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  
  // Region Analysis State
  const [analyzingRegion, setAnalyzingRegion] = useState(false);
  const [regionData, setRegionData] = useState<RegionAnalysis | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const t = (key: string) => getTranslation(lang, key);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lon: longitude });
            
            const data = await fetchLocalWeather(latitude, longitude);
            setWeather(data);
          } catch (err) {
            setError("Weather unavailable");
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError("Location access denied");
          setLoading(false);
          // Default to central India coordinates if blocked
          setCoords({ lat: 20.5937, lon: 78.9629 });
        }
      );
    } else {
      setError("Geolocation not supported");
      setLoading(false);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (coords && mapContainerRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([coords.lat, coords.lon], 13);

      // Using CartoDB Voyager tiles for a clean, premium "Mapbox-like" look without API keys
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      L.marker([coords.lat, coords.lon]).addTo(mapInstanceRef.current)
        .bindPopup('Your Farm Location')
        .openPopup();
      
      // Fix for map rendering issues in some containers
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }
  }, [coords]);

  const handleRegionAnalysis = async () => {
    if (!coords) return;
    setAnalyzingRegion(true);
    setRegionData(null);
    try {
      const result = await analyzeRegion(coords.lat, coords.lon, lang);
      setRegionData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingRegion(false);
    }
  };

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-purple-500" />;
    if (code >= 71) return <Snowflake className="w-8 h-8 text-blue-300" />;
    if (code >= 51) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code >= 45) return <CloudFog className="w-8 h-8 text-cement-400" />;
    if (code <= 3 && !isDay) return <Moon className="w-8 h-8 text-indigo-400" />;
    return <Sun className="w-8 h-8 text-amber-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-cement-200 h-full flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cement-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-cement-100 bg-cement-50/50 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
           <MapPin className="w-3.5 h-3.5 text-cement-400" />
           <h3 className="text-xs font-semibold text-cement-600">
             {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : t('liveLocation')}
           </h3>
        </div>
        <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">{t('online')}</span>
      </div>
      
      {/* Content Split: Map and Weather */}
      <div className="flex-1 flex flex-col">
        {/* Map Section */}
        <div className="relative h-48 w-full bg-cement-100">
           <div ref={mapContainerRef} className="absolute inset-0 z-0" />
           
           {/* Map Overlay Button */}
           <button 
             onClick={handleRegionAnalysis}
             disabled={analyzingRegion}
             className="absolute bottom-3 right-3 z-[400] bg-white text-cement-800 text-xs font-bold px-3 py-2 rounded-lg shadow-md border border-cement-200 flex items-center gap-2 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-70"
           >
             {analyzingRegion ? (
               <Loader2 className="w-3 h-3 animate-spin" /> 
             ) : (
               <Satellite className="w-3 h-3" />
             )}
             {analyzingRegion ? t('analyzingRegion') : t('analyzeRegion')}
           </button>
        </div>

        {/* Region Analysis Result (Collapsible/Conditional) */}
        {regionData && (
          <div className="bg-green-50 p-3 border-b border-green-100 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-green-800 mb-2 uppercase flex items-center gap-1">
              <Locate className="w-3 h-3" /> {t('regionAnalysis')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-green-600 font-medium block">{t('soilPotential')}</span>
                <span className="text-cement-700">{regionData.soilPotential}</span>
              </div>
              <div>
                <span className="text-green-600 font-medium block">{t('climate')}</span>
                <span className="text-cement-700">{regionData.climateSuitability}</span>
              </div>
              <div className="col-span-2 mt-1 pt-1 border-t border-green-200">
                <span className="font-bold text-green-900">Rating: {regionData.overallRating}</span>
              </div>
            </div>
          </div>
        )}

        {/* Weather Details */}
        {weather && (
          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-4xl font-bold text-cement-900">{weather.temp}°C</span>
                <p className="text-cement-500 text-sm font-medium mt-1 flex items-center gap-1">
                  {getWeatherDescription(weather.conditionCode)}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                {getWeatherIcon(weather.conditionCode, weather.isDay)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cement-50 p-3 rounded-lg border border-cement-100">
                <div className="flex items-center gap-2 mb-1 text-cement-500">
                  <Droplets className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium uppercase">Humidity</span>
                </div>
                <span className="text-lg font-semibold text-cement-800">{weather.humidity}%</span>
              </div>
              <div className="bg-cement-50 p-3 rounded-lg border border-cement-100">
                <div className="flex items-center gap-2 mb-1 text-cement-500">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium uppercase">Precip</span>
                </div>
                <span className="text-lg font-semibold text-cement-800">{weather.precipitation}mm</span>
              </div>
            </div>

            {/* Alerts */}
            {weather.alerts.map((alert, idx) => (
              alert.type !== 'none' && (
                <div key={idx} className={`rounded-lg p-3 border flex items-start gap-3 ${
                  alert.level === 'high' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    alert.level === 'high' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div>
                    <p className={`text-xs font-bold uppercase mb-0.5 ${
                      alert.level === 'high' ? 'text-red-700' : 'text-amber-700'
                    }`}>{alert.type} Warning</p>
                    <p className={`text-xs leading-tight ${
                      alert.level === 'high' ? 'text-red-600' : 'text-amber-600'
                    }`}>{alert.message}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
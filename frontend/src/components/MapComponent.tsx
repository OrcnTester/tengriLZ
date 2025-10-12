import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  baseMap: 'osm' | 'opentopo' | 'esri' | 'mapbox';
  onMapClick: (lat: number, lng: number) => void;
  onMapCenterChange: (center: { lat: number; lng: number }) => void;
  onZoomChange?: (zoom: number) => void; // Added optional onZoomChange prop
  geoJsonData?: GeoJSON.FeatureCollection; // Added geoJsonData prop
}

const MapComponent = forwardRef<L.Map | undefined, MapComponentProps>(({
  center,
  zoom,
  baseMap,
  onMapClick,
  onMapCenterChange,
  onZoomChange,
  geoJsonData,
}, ref) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const drawnLayerRef = useRef<L.LayerGroup | null>(null);

  const handleMapClick = useCallback((ev: L.LeafletMouseEvent) => {
    const { lat, lng } = ev.latlng;
    onMapClick(lat, lng);
  }, [onMapClick]);

  const handleMoveEnd = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      onMapCenterChange({ lat: center.lat, lng: center.lng });
    }
  }, [onMapCenterChange]);

  const handleZoomEnd = useCallback(() => {
    if (mapInstanceRef.current) {
      const zoom = mapInstanceRef.current.getZoom();
      onZoomChange?.(zoom);
    }
  }, [onZoomChange]);

  const handleMapClickRef = useRef(handleMapClick);
  const handleMoveEndRef = useRef(handleMoveEnd);
  const handleZoomEndRef = useRef(handleZoomEnd);

  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
    handleMoveEndRef.current = handleMoveEnd;
    handleZoomEndRef.current = handleZoomEnd;
  }, [handleMapClick, handleMoveEnd, handleZoomEnd]);

  useImperativeHandle(ref, () => mapInstanceRef.current || undefined, []);

  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    centerRef.current = center;
    zoomRef.current = zoom;
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        minZoom: 1,
        maxZoom: 22,
      }).setView(centerRef.current, zoomRef.current);
      mapInstanceRef.current = map;

      drawnLayerRef.current = L.layerGroup().addTo(map);

      map.on('click', (e) => handleMapClickRef.current(e));
      map.on('moveend', () => handleMoveEndRef.current());
      map.on('zoomend', () => handleZoomEndRef.current());
    }

    const tileLayers: Record<'osm' | 'mapbox', L.TileLayer> = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
      mapbox: L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=YOUR_MAPBOX_ACCESS_TOKEN', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1,
      }),
    };

    // Altlık haritasını güncelle
    Object.values(tileLayers).forEach((layer) => {
      if (mapInstanceRef.current?.hasLayer(layer)) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });
    tileLayers[baseMap as 'osm' | 'mapbox'].addTo(mapInstanceRef.current);
  }, [baseMap]); // Used refs to avoid unnecessary re-renders

  const stylePoly = () => ({
    color: '#22c55e',
    weight: 2,
    fillColor: '#22c55e',
    fillOpacity: 0.25,
  });

  const styleBestPoly = () => ({
    color: '#ef4444',
    weight: 3,
    fillColor: '#ef4444',
    fillOpacity: 0.4,
  });

  const makeRankIcon = (n: number, secondary = false) => {
    return L.divIcon({
      className: `lz-rank${secondary ? ' secondary' : ''}`,
      html: String(n),
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  useEffect(() => {
    if (geoJsonData && drawnLayerRef.current) {
      drawnLayerRef.current.clearLayers();
      L.geoJSON(geoJsonData, {
        style: (feature) => {
          if (feature && feature.properties?.best) {
            return styleBestPoly();
          }
          return stylePoly();
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties) {
            layer.bindPopup(
              Object.entries(feature.properties)
                .map(([key, value]) => `${key}: ${value}`)
                .join('<br>')
            );
          }
        },
        pointToLayer: (feature, latlng) => {
          const rank = feature.properties?.rank || 0; // Assuming `rank` is a property in GeoJSON
          const isBest = feature.properties?.best || false; // Assuming `best` is a property in GeoJSON
          return L.marker(latlng, { icon: makeRankIcon(rank, isBest) });
        },
      }).addTo(drawnLayerRef.current);
    }
  }, [geoJsonData]); // GeoJSON verisi değiştiğinde güncelle

  return <div ref={mapRef} className="h-full w-full" style={{ minHeight: '400px' }} />;
});

export default MapComponent;

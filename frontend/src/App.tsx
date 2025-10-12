import React, { useState, useRef } from 'react';
import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import * as turf from '@turf/turf';
import TopBar from './components/TopBar';
import Panel from './components/Panel';
import MapComponent from './components/MapComponent';

const App: React.FC = () => {
  const [panelOpen, setPanelOpen] = useState(true); // State to manage panel visibility
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.2219, 29.3802]);
  const [baseMap, setBaseMap] = useState<'osm' | 'opentopo' | 'esri'>('osm'); // Explicitly typed baseMap state
  const [mapZoom, setMapZoom] = useState(11); // Added state for dynamic zoom level
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | undefined>(undefined); // State to store GeoJSON data
  const [m2Window] = useState(3000);
  const [pad] = useState(300);
  const [minH] = useState(2);
  const [sigma] = useState(1);
  const [altMode] = useState<'AGL' | 'MSL'>('AGL');
  const [altVal] = useState(60);
  const [corridor] = useState(150);
  const [minClr] = useState(30);
  const [step] = useState(25);
  const [topLZ, setTopLZ] = useState<{ lat: number; lon: number; radius: number; props: Record<string, unknown> }[]>([]);
  const mapInstanceRef = useRef<L.Map | null>(null); // Ref to store the map instance
  const layerGroupRef = useRef<L.LayerGroup | null>(null); // Ref to store the layer group

  const handlePanelToggle = () => {
    setPanelOpen((prev) => {
      const newState = !prev;
      setTimeout(() => {
        if (mapInstanceRef.current) {
          console.log('Calling invalidateSize on map instance after panel toggle');
          mapInstanceRef.current.invalidateSize();
        }
      }, 400); // Slightly increased delay to ensure transition completes
      return newState;
    });
  };

  const handleRunAnalysis = async () => {
    try {
      const params = new URLSearchParams({
        lat: mapCenter[0].toString(),
        lon: mapCenter[1].toString(),
        window_m: '800',
        slope_max_deg: '12',
        min_diameter_m: '30',
        morph: 'opening',
      });

      const response = await fetch(`http://localhost:8000/candidates?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const centers = data.features
        .filter((f: GeoJSON.Feature) => f.geometry?.type === 'Point')
        .map((f: GeoJSON.Feature) => {
          if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
            return {
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
              radius: f.properties?.clear_radius_m || 0,
              props: f.properties,
            };
          }
          return null;
        })
        .filter((item: { lat: number; lon: number; radius: number; props: Record<string, unknown> } | null): item is { lat: number; lon: number; radius: number; props: Record<string, unknown> } => item !== null);

      centers.sort((a: { radius: number }, b: { radius: number }) => b.radius - a.radius);
      const top = centers.slice(0, 10);

      const processedData = {
        ...data,
        features: data.features.map((feature: GeoJSON.Feature, index: number) => {
          if (feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            const { coordinates } = feature.geometry;
            return {
              ...feature,
              properties: {
                ...feature.properties,
                rank: index + 1,
                best: top.some((lz: { lat: number; lon: number }) => lz.lat === coordinates[1] && lz.lon === coordinates[0]),
              },
            };
          }
          return feature;
        }),
      };

      setTopLZ(top);
      setGeoJsonData(processedData);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const handleZoomToBest = () => {
    if (topLZ.length > 0) {
      const bestLZ = topLZ[0];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([bestLZ.lat, bestLZ.lon], 15);
      }
    }
  };

  const handleObstaclesAOI = async () => {
    try {
      const params = new URLSearchParams({
        lat: mapCenter[0].toString(),
        lon: mapCenter[1].toString(),
        window_m: m2Window.toString(),
        pad_m: pad.toString(),
        min_h: minH.toString(),
        smooth_sigma: sigma.toString(),
        out_crs: 'EPSG:4326',
      });

      const response = await fetch(`http://localhost:8000/m2/obstacles/aoi?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeoJsonData(data);
    } catch (error) {
      console.error('Error fetching obstacles AOI:', error);
    }
  };

  const handleClearanceAOI = async () => {
    try {
      const params = new URLSearchParams({
        lat0: mapCenter[0].toString(),
        lon0: mapCenter[1].toString(),
        lat1: (mapCenter[0] + 0.01).toString(),
        lon1: (mapCenter[1] + 0.01).toString(),
        window_m: m2Window.toString(),
        min_h: minH.toString(),
        out_crs: 'EPSG:4326',
      });

      const body = {
        altitude: { mode: altMode, value_m: altVal },
        corridor_width_m: corridor,
        min_clearance_m: minClr,
        step_m: step,
      };

      const response = await fetch(`http://localhost:8000/m2/clearance/aoi?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeoJsonData(data.segments);

      // Process clearance response to render segments on the map
      handleClearanceResponse(data);
    } catch (error) {
      console.error('Error fetching clearance AOI:', error);
    }
  };

  const handleZoomToGeoJson = (geoJsonData: GeoJSON.FeatureCollection) => {
    if (mapInstanceRef.current && geoJsonData.features.length > 0) {
      const bbox = turf.bbox(geoJsonData); // Calculate bounding box
      const bounds: L.LatLngBoundsExpression = [
        [bbox[1], bbox[0]], // Southwest corner
        [bbox[3], bbox[2]], // Northeast corner
      ];
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  const handleClearanceResponse = (response: { segments: GeoJSON.FeatureCollection }) => {
    try {
      const segments = response.segments;

      if (!segments || !mapInstanceRef.current) {
        console.warn('No segments or map instance available.');
        return;
      }

      const styleSegment = (status: string) => {
        switch (status) {
          case 'pass':
            return { color: '#22c55e', weight: 4 };
          case 'fail':
            return { color: '#ef4444', weight: 4 };
          default:
            return { color: '#facc15', weight: 4 };
        }
      };

      // Clear existing layers before adding new ones
      if (layerGroupRef.current && mapInstanceRef.current.hasLayer(layerGroupRef.current)) {
        mapInstanceRef.current.removeLayer(layerGroupRef.current);
      }

      const newLayerGroup = L.layerGroup();
      L.geoJSON(segments, {
        style: (feature) => feature?.properties ? styleSegment(feature.properties.status) : {},
        onEachFeature: (feature, layer) => {
          if (feature?.properties) {
            const { clearance_m, status } = feature.properties;
            layer.bindPopup(`Clearance: ${clearance_m}m<br>Status: ${status}`);
          }
        },
      }).addTo(newLayerGroup);

      newLayerGroup.addTo(mapInstanceRef.current);
      layerGroupRef.current = newLayerGroup; // Update the reference

      // Zoom to the extent of the rendered GeoJSON
      handleZoomToGeoJson(segments);
    } catch (error) {
      console.error('Error rendering clearance response:', error);
    }
  };

  return (
    <div className="h-screen grid" style={{ gridTemplateRows: '56px 1fr', gridTemplateAreas: '"top top" "main main"' }}>
      <TopBar
        onTogglePanel={handlePanelToggle}
        onClear={() => console.log('Clear clicked')}
        onDownload={() => console.log('Download clicked')}
      />
      <div className="relative" style={{ gridArea: 'main' }}>
        {panelOpen && (
          <div
            className="absolute top-0 left-0 h-full bg-white shadow-lg overflow-y-auto"
            style={{ width: '450px', transition: 'transform 0.3s', transform: panelOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <Panel
              panelCollapsed={!panelOpen}
              baseUrl="http://localhost:8000"
              onBaseUrlChange={(url) => console.log('Base URL changed:', url)}
              selectedBaseMap={baseMap}
              onBaseMapChange={(baseMap) => setBaseMap(baseMap as 'osm' | 'opentopo' | 'esri')} // Cast to correct type
              lat={mapCenter[0]}
              lon={mapCenter[1]}
              onLatChange={(lat) => setMapCenter([lat, mapCenter[1]])}
              onLonChange={(lon) => setMapCenter([mapCenter[0], lon])}
              onUseMapCenter={() => console.log('Use map center clicked')}
              preset="EC135"
              rotor={10.2}
              margin={6}
              k={1.5}
              slope={8}
              diameter={30}
              onPresetChange={(preset) => console.log('Preset changed:', preset)}
              onRotorChange={(rotor) => console.log('Rotor changed:', rotor)}
              onMarginChange={(margin) => console.log('Margin changed:', margin)}
              onKChange={(k) => console.log('K changed:', k)}
              onSlopeChange={(slope) => console.log('Slope changed:', slope)}
              onDiameterChange={(diameter) => console.log('Diameter changed:', diameter)}
              window={800}
              analysisSlope={12}
              morph="opening"
              onWindowChange={(window) => console.log('Window changed:', window)}
              onAnalysisSlopeChange={(slope) => console.log('Analysis slope changed:', slope)}
              onMorphChange={(morph) => console.log('Morph changed:', morph)}
              onRun={handleRunAnalysis}
              m2Window={3000}
              pad={300}
              minH={2}
              sigma={1}
              altMode="AGL"
              altVal={60}
              corridor={150}
              minClr={30}
              step={25}
              end="39.790, 30.560"
              onM2WindowChange={(window) => console.log('M2 window changed:', window)}
              onPadChange={(pad) => console.log('Pad changed:', pad)}
              onMinHChange={(minH) => console.log('Min H changed:', minH)}
              onSigmaChange={(sigma) => console.log('Sigma changed:', sigma)}
              onAltModeChange={(altMode) => console.log('Alt mode changed:', altMode)}
              onAltValChange={(altVal) => console.log('Alt val changed:', altVal)}
              onCorridorChange={(corridor) => console.log('Corridor changed:', corridor)}
              onMinClrChange={(minClr) => console.log('Min clearance changed:', minClr)}
              onStepChange={(step) => console.log('Step changed:', step)}
              onEndChange={(end) => console.log('End changed:', end)}
              onObstaclesAOI={handleObstaclesAOI}
              onClearanceAOI={handleClearanceAOI}
              topLZ={topLZ}
              onZoomToBest={handleZoomToBest}
              onLZClick={(lz) => console.log('LZ clicked:', lz)}
              onScan={(radiusKm, stepM) => console.log('Scan clicked:', radiusKm, stepM)}
            />
          </div>
        )}
        <div
          className="h-full"
          style={{ marginLeft: panelOpen ? '450px' : '0', transition: 'margin-left 0.3s, width 0.3s', width: panelOpen ? 'calc(100% - 450px)' : '100%' }}
        >
          <MapComponent
            center={mapCenter}
            zoom={mapZoom} // Use dynamic zoom level
            baseMap={baseMap}
            onMapClick={(lat, lng) => console.log('Map clicked at:', lat, lng)}
            onMapCenterChange={(center) => {
              setMapCenter([center.lat, center.lng]);
            }}
            onZoomChange={(zoom: number) => setMapZoom(zoom)} // Added type for zoom
            ref={mapInstanceRef} // Attach ref to MapComponent
            geoJsonData={geoJsonData} // Pass GeoJSON data to MapComponent
          />
        </div>
      </div>
    </div>
  );
};

export default App;
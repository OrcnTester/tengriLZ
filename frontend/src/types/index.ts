export interface AircraftPreset {
  rotor: number;
  margin: number;
  k: number;
  slope: number;
}

export interface AircraftPresets {
  EC135: AircraftPreset;
  'UH-1H': AircraftPreset;
  S70: AircraftPreset;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface LZCenter {
  lat: number;
  lon: number;
  radius: number;
  props: any;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: number[] | number[][];
  };
  properties: any;
}

export interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  meta?: any;
}

export interface ClearanceResponse {
  segments: GeoJSONResponse;
  hotspots: GeoJSONResponse;
  summary: {
    segments?: number;
    fails?: number;
    unknowns?: number;
    min_clearance_m?: number;
  };
}

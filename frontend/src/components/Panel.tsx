import React from 'react';
import ConnectionSection from './ConnectionSection';
import BaseMapSection from './BaseMapSection';
import LocationSection from './LocationSection';
import AircraftSection from './AircraftSection';
import AnalysisSection from './AnalysisSection';
import M2Section from './M2Section';
import TopLZSection from './TopLZSection';
import ScanSection from './ScanSection';

interface PanelProps {
  panelCollapsed?: boolean;
  isMobile?: boolean;
  // Connection
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  
  // Base Map
  selectedBaseMap: string;
  onBaseMapChange: (baseMap: string) => void;
  
  // Location
  lat: number;
  lon: number;
  onLatChange: (lat: number) => void;
  onLonChange: (lon: number) => void;
  onUseMapCenter: () => void;
  
  // Aircraft
  preset: string;
  rotor: number;
  margin: number;
  k: number;
  slope: number;
  diameter: number;
  onPresetChange: (preset: string) => void;
  onRotorChange: (rotor: number) => void;
  onMarginChange: (margin: number) => void;
  onKChange: (k: number) => void;
  onSlopeChange: (slope: number) => void;
  onDiameterChange: (diameter: number) => void;
  
  // Analysis
  window: number;
  analysisSlope: number;
  morph: 'closing' | 'opening';
  onWindowChange: (window: number) => void;
  onAnalysisSlopeChange: (slope: number) => void;
  onMorphChange: (morph: 'closing' | 'opening') => void;
  onRun: () => void;
  
  // M2
  m2Window: number;
  pad: number;
  minH: number;
  sigma: number;
  altMode: 'AGL' | 'MSL';
  altVal: number;
  corridor: number;
  minClr: number;
  step: number;
  end: string;
  onM2WindowChange: (window: number) => void;
  onPadChange: (pad: number) => void;
  onMinHChange: (minH: number) => void;
  onSigmaChange: (sigma: number) => void;
  onAltModeChange: (altMode: 'AGL' | 'MSL') => void;
  onAltValChange: (altVal: number) => void;
  onCorridorChange: (corridor: number) => void;
  onMinClrChange: (minClr: number) => void;
  onStepChange: (step: number) => void;
  onEndChange: (end: string) => void;
  onObstaclesAOI: () => void;
  onClearanceAOI: () => void;
  
  // Top LZ
  topLZ: any[];
  onZoomToBest: () => void;
  onLZClick: (lz: any) => void;
  
  // Scan
  onScan: (radiusKm: number, stepM: number) => void;
}

const Panel: React.FC<PanelProps> = ({
  panelCollapsed = false,
  isMobile = false,
  baseUrl,
  onBaseUrlChange,
  selectedBaseMap,
  onBaseMapChange,
  lat,
  lon,
  onLatChange,
  onLonChange,
  onUseMapCenter,
  preset,
  rotor,
  margin,
  k,
  slope,
  diameter,
  onPresetChange,
  onRotorChange,
  onMarginChange,
  onKChange,
  onSlopeChange,
  onDiameterChange,
  window,
  analysisSlope,
  morph,
  onWindowChange,
  onAnalysisSlopeChange,
  onMorphChange,
  onRun,
  m2Window,
  pad,
  minH,
  sigma,
  altMode,
  altVal,
  corridor,
  minClr,
  step,
  end,
  onM2WindowChange,
  onPadChange,
  onMinHChange,
  onSigmaChange,
  onAltModeChange,
  onAltValChange,
  onCorridorChange,
  onMinClrChange,
  onStepChange,
  onEndChange,
  onObstaclesAOI,
  onClearanceAOI,
  topLZ,
  onZoomToBest,
  onLZClick,
  onScan,
}) => {
  return (
    <aside className={`bg-panel border-r border-muted overflow-y-auto p-3.5 gap-3.5 grid grid-rows-min shadow-custom relative panel ${
      isMobile && panelCollapsed ? 'open' : ''
    }`} style={{ gridArea: 'panel' }}>
      <ConnectionSection 
        baseUrl={baseUrl}
        onBaseUrlChange={onBaseUrlChange}
      />
      
      <BaseMapSection 
        selectedBaseMap={selectedBaseMap}
        onBaseMapChange={onBaseMapChange}
      />
      
      <LocationSection 
        lat={lat}
        lon={lon}
        onLatChange={onLatChange}
        onLonChange={onLonChange}
        onUseMapCenter={onUseMapCenter}
      />
      
      <AircraftSection 
        preset={preset}
        rotor={rotor}
        margin={margin}
        k={k}
        slope={slope}
        diameter={diameter}
        onPresetChange={onPresetChange}
        onRotorChange={onRotorChange}
        onMarginChange={onMarginChange}
        onKChange={onKChange}
        onSlopeChange={onSlopeChange}
        onDiameterChange={onDiameterChange}
      />
      
      <AnalysisSection 
        window={window}
        slope={analysisSlope}
        morph={morph}
        onWindowChange={onWindowChange}
        onSlopeChange={onAnalysisSlopeChange}
        onMorphChange={onMorphChange}
        onRun={onRun}
      />
      
      <M2Section 
        window={m2Window}
        pad={pad}
        minH={minH}
        sigma={sigma}
        altMode={altMode}
        altVal={altVal}
        corridor={corridor}
        minClr={minClr}
        step={step}
        end={end}
        onWindowChange={onM2WindowChange}
        onPadChange={onPadChange}
        onMinHChange={onMinHChange}
        onSigmaChange={onSigmaChange}
        onAltModeChange={onAltModeChange}
        onAltValChange={onAltValChange}
        onCorridorChange={onCorridorChange}
        onMinClrChange={onMinClrChange}
        onStepChange={onStepChange}
        onEndChange={onEndChange}
        onObstaclesAOI={onObstaclesAOI}
        onClearanceAOI={onClearanceAOI}
      />
      
      <TopLZSection 
        topLZ={topLZ}
        onZoomToBest={onZoomToBest}
        onLZClick={onLZClick}
      />
      
      <ScanSection 
        onScan={onScan}
      />
    </aside>
  );
};

export default Panel;

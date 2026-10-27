import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { api } from '../services/api.js';
import { FALLBACK_SHIPMENTS, FALLBACK_WAREHOUSES } from '../services/fallbackData.js';
import { ShipmentItem, WarehouseItem } from '../types/index.js';
import { calculateReeferBatteryStatus } from '../services/batteryDiagnosticService.js';
import {
  Truck,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Maximize2,
  Minimize2,
  Navigation,
  MapPin,
  Building2,
  Layers,
  Search,
  Zap,
  Clock,
  Eye,
  CheckCircle2,
  Radio,
  Flame,
  Snowflake,
} from 'lucide-react';

// Known coordinates across Tamil Nadu / South India Cold-Chain Network
const CITY_COORDINATES: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  guindy: [13.0067, 80.2030],
  nagercoil: [8.1833, 77.4119],
  madurai: [9.9252, 78.1198],
  coimbatore: [11.0168, 76.9558],
  trichy: [10.7905, 78.7047],
  tiruchirappalli: [10.7905, 78.7047],
  salem: [11.6643, 78.1460],
  villupuram: [11.9401, 79.4861],
  tindivanam: [12.2344, 79.6542],
  perambalur: [11.2342, 78.8821],
  chengalpattu: [12.6841, 79.9836],
  vellore: [12.9165, 79.1325],
  tirunelveli: [8.7139, 77.7567],
  erode: [11.3410, 77.7172],
  thanjavur: [10.7870, 79.1378],
  cuddalore: [11.7480, 79.7714],
  dindigul: [10.3673, 77.9803],
  karur: [10.9601, 78.0766],
  hosur: [12.7409, 77.8253],
  kanchipuram: [12.8342, 79.7036],
  nagapattinam: [10.7656, 79.8424],
};

// Safe lookup with fuzzy substring match
export function getCoordinatesForLocation(locName?: string): [number, number] {
  if (!locName) return [11.1271, 78.6569]; // Default Central Tamil Nadu
  const clean = locName.toLowerCase();

  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(key)) {
      return coords;
    }
  }

  // Consistent hash fallback within South India boundaries if unknown
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 400) - 200) / 100;
  const lngOffset = ((Math.abs(hash >> 3) % 400) - 200) / 100;
  return [11.12 + latOffset * 0.5, 78.65 + lngOffset * 0.5];
}

// Compute vehicle position along corridor
export function getInterpolatedShipmentPosition(shipment: ShipmentItem): [number, number] {
  const originCoords = getCoordinatesForLocation(shipment.origin);
  const destCoords = getCoordinatesForLocation(shipment.destination);

  if (shipment.status === 'DELIVERED' || shipment.remainingTravelTime <= 0) {
    return destCoords;
  }

  const expected = shipment.expectedTravelTime > 0 ? shipment.expectedTravelTime : 6.0;
  const remaining = Math.max(0, shipment.remainingTravelTime);
  let progress = (expected - remaining) / expected;
  progress = Math.min(Math.max(progress, 0.08), 0.92);

  // Slight realistic curve to avoid exact straight line
  const lat = originCoords[0] + (destCoords[0] - originCoords[0]) * progress;
  const lng = originCoords[1] + (destCoords[1] - originCoords[1]) * progress;
  const curve = Math.sin(progress * Math.PI) * 0.08;

  return [lat + curve, lng - curve * 0.4];
}

interface RealtimeShipmentMapProps {
  shipments?: ShipmentItem[];
  warehouses?: WarehouseItem[];
  selectedShipmentId?: string;
  onSelectShipment?: (shipment: ShipmentItem) => void;
  height?: string;
  showControls?: boolean;
  autoRefreshInterval?: number; // seconds
  singleShipmentMode?: boolean;
  className?: string;
}

export const RealtimeShipmentMap: React.FC<RealtimeShipmentMapProps> = ({
  shipments: externalShipments,
  warehouses: externalWarehouses,
  selectedShipmentId,
  onSelectShipment,
  height = '580px',
  showControls = true,
  autoRefreshInterval = 10,
  singleShipmentMode = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);

  // Local state for self-contained or live polling operation
  const [internalShipments, setInternalShipments] = useState<ShipmentItem[]>(FALLBACK_SHIPMENTS);
  const [internalWarehouses, setInternalWarehouses] = useState<WarehouseItem[]>(FALLBACK_WAREHOUSES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [secondsUntilSync, setSecondsUntilSync] = useState(autoRefreshInterval);

  // Map view controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'CRITICAL' | 'IN_TRANSIT'>('ALL');
  const [focusedShipmentId, setFocusedShipmentId] = useState<string | null>(selectedShipmentId || null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const shipments = externalShipments && externalShipments.length > 0 ? externalShipments : internalShipments;
  const warehouses = externalWarehouses && externalWarehouses.length > 0 ? externalWarehouses : internalWarehouses;

  // Sync internal shipments with props
  useEffect(() => {
    if (externalShipments && externalShipments.length > 0) {
      setInternalShipments(externalShipments);
    }
  }, [externalShipments]);

  useEffect(() => {
    if (externalWarehouses && externalWarehouses.length > 0) {
      setInternalWarehouses(externalWarehouses);
    }
  }, [externalWarehouses]);

  useEffect(() => {
    if (selectedShipmentId) {
      setFocusedShipmentId(selectedShipmentId);
    }
  }, [selectedShipmentId]);

  // Fetch data if not provided via props
  const fetchMapData = async () => {
    try {
      setRefreshing(true);
      const [shipRes, whRes] = await Promise.all([
        api.getShipments(),
        api.getWarehouses(),
      ]);
      if (shipRes?.shipments && shipRes.shipments.length > 0) {
        setInternalShipments(shipRes.shipments);
      }
      if (whRes?.warehouses && whRes.warehouses.length > 0) {
        setInternalWarehouses(whRes.warehouses);
      }
      setLastSyncTime(new Date());
      setSecondsUntilSync(autoRefreshInterval);
    } catch (err) {
      console.warn('Notice: Map telemetry polling sync deferred:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!externalShipments || externalShipments.length === 0) {
      fetchMapData();
    }
  }, []);

  // Countdown timer for real-time polling
  useEffect(() => {
    if (!autoRefreshActive) return;

    const timer = setInterval(() => {
      setSecondsUntilSync((prev) => {
        if (prev <= 1) {
          fetchMapData();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshActive, autoRefreshInterval]);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map instance centered around Tamil Nadu cold corridor
    const map = L.map(mapContainerRef.current, {
      center: [11.1271, 78.6569],
      zoom: singleShipmentMode ? 8 : 7,
      zoomControl: true,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 16,
    });

    // CartoDB Voyager Tile Layer (Modern, crisp, high-contrast English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> | <strong>VAXGUARD Cold-Chain Telemetry</strong>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Initialize layer groups
    const routesLayer = L.layerGroup().addTo(map);
    const facilitiesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    routesLayerRef.current = routesLayer;
    facilitiesLayerRef.current = facilitiesLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Calculate fleet stats
  const fleetStats = useMemo(() => {
    const total = shipments.length;
    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let inTransitCount = 0;
    let totalTemp = 0;

    shipments.forEach((s) => {
      totalTemp += s.currentTemperature;
      if (s.status === 'IN_TRANSIT' || s.status === 'AT_RISK') {
        inTransitCount++;
      }
      if (s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature || s.riskLevel === 'CRITICAL') {
        criticalCount++;
      } else if (s.currentTemperature >= 6.5 || s.riskLevel === 'HIGH' || s.riskLevel === 'MODERATE') {
        warningCount++;
      } else {
        safeCount++;
      }
    });

    return {
      total,
      safeCount,
      warningCount,
      criticalCount,
      inTransitCount,
      avgTemp: total > 0 ? (totalTemp / total).toFixed(1) : '4.5',
    };
  }, [shipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      // Query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          s.trackingId.toLowerCase().includes(q) ||
          s.vaccineName.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.driverName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Single shipment mode
      if (singleShipmentMode && selectedShipmentId) {
        return s._id === selectedShipmentId || s.trackingId === selectedShipmentId;
      }

      // Status filter
      if (statusFilter === 'SAFE') {
        return s.currentTemperature <= 6.5 && s.currentTemperature >= s.safeMinTemperature && s.riskLevel === 'LOW';
      }
      if (statusFilter === 'WARNING') {
        return (s.currentTemperature > 6.5 && s.currentTemperature <= s.safeMaxTemperature) || s.riskLevel === 'MODERATE' || s.riskLevel === 'HIGH';
      }
      if (statusFilter === 'CRITICAL') {
        return s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature || s.status === 'AT_RISK' || s.riskLevel === 'CRITICAL';
      }
      if (statusFilter === 'IN_TRANSIT') {
        return s.status === 'IN_TRANSIT' || s.status === 'AT_RISK';
      }

      return true;
    });
  }, [shipments, searchQuery, statusFilter, singleShipmentMode, selectedShipmentId]);

  // Quick simulation actions directly from map
  const handleSimulateTemp = async (shipmentId: string, delta: number) => {
    try {
      setActionMessage(`Applying ${delta > 0 ? '+' : ''}${delta}°C thermal change...`);
      const res = await api.simulateTemperatureRise({
        shipmentId,
        delta,
        step: delta > 0 ? 1 : 0,
      });

      // Update in local state
      setInternalShipments((prev) =>
        prev.map((s) => (s._id === res.shipment._id || s.trackingId === res.shipment.trackingId ? res.shipment : s))
      );

      setActionMessage(
        `Updated ${res.shipment.trackingId} to ${res.shipment.currentTemperature}°C (${res.shipment.riskLevel} risk).`
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Simulation error: ${err.message || 'Failed'}`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Fly to specific shipment on map
  const flyToShipment = (shipment: ShipmentItem) => {
    setFocusedShipmentId(shipment._id);
    if (onSelectShipment) onSelectShipment(shipment);

    if (mapInstanceRef.current) {
      const coords = getInterpolatedShipmentPosition(shipment);
      mapInstanceRef.current.flyTo(coords, 10, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  // Recenter map to frame all active shipments
  const fitFleetBounds = () => {
    if (!mapInstanceRef.current || shipments.length === 0) return;
    const points: [number, number][] = shipments.map((s) => getInterpolatedShipmentPosition(s));
    if (showFacilities) {
      warehouses.forEach((w) => {
        points.push(getCoordinatesForLocation(w.location || w.name));
      });
    }
    const bounds = L.latLngBounds(points);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
  };

  // 2. Render Markers, Routes, and Facilities
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    const facilitiesLayer = facilitiesLayerRef.current;

    if (!map || !markersLayer || !routesLayer || !facilitiesLayer) return;

    // Clear existing layers
    markersLayer.clearLayers();
    routesLayer.clearLayers();
    facilitiesLayer.clearLayers();

    // A. Render Cold Storage Facilities (Warehouses & Hospitals)
    if (showFacilities && !singleShipmentMode) {
      warehouses.forEach((w) => {
        const coords = getCoordinatesForLocation(w.location || w.name);
        const isNormal = w.powerStatus === 'ON' && w.refrigerationStatus === 'NORMAL';
        const color = isNormal ? '#2563eb' : '#dc2626';

        const whIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
              <div class="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-tight shadow-md text-white whitespace-nowrap mb-1 flex items-center space-x-1"
                   style="background: ${isNormal ? 'linear-gradient(135deg, #1e40af, #2563eb)' : 'linear-gradient(135deg, #991b1b, #dc2626)'};">
                <span class="w-1.5 h-1.5 rounded-full ${isNormal ? 'bg-cyan-300' : 'bg-yellow-300 animate-ping'}"></span>
                <span>${w.code}</span>
                <span class="opacity-90 font-mono text-[9px]">${w.currentTemperature}°C</span>
              </div>
              <div class="w-8 h-8 rounded-xl bg-white border-2 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                   style="border-color: ${color}; color: ${color};">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                  <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
                </svg>
              </div>
              <div class="w-1.5 h-1.5 rounded-full bg-slate-900 mt-0.5"></div>
            </div>
          `,
          iconSize: [36, 48],
          iconAnchor: [18, 48],
        });

        const whMarker = L.marker(coords, { icon: whIcon });
        whMarker.bindPopup(`
          <div class="p-3.5 max-w-[270px] text-slate-800">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span class="font-bold text-xs text-blue-700 font-mono uppercase">${w.code} • Cold Depot</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                isNormal ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }">${w.refrigerationStatus}</span>
            </div>
            <h4 class="font-bold text-sm text-slate-900 mb-1">${w.name}</h4>
            <p class="text-xs text-slate-500 mb-2">${w.location}</p>
            <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2 font-mono">
              <div>
                <span class="text-slate-400 block text-[10px]">TEMP</span>
                <span class="font-bold ${w.currentTemperature > 8 ? 'text-red-600' : 'text-blue-700'}">${w.currentTemperature}°C</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px]">POWER</span>
                <span class="font-bold ${w.powerStatus === 'ON' ? 'text-emerald-600' : 'text-red-600'}">${w.powerStatus}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px]">SAFE HOLD</span>
                <span class="font-bold text-slate-700">${w.estimatedSafeHoldingTime} min</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px]">OCCUPANCY</span>
                <span class="font-bold text-slate-700">${w.currentOccupancy?.toLocaleString() || 0}</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Manager: ${w.managerName}</span>
            </div>
          </div>
        `);

        facilitiesLayer.addLayer(whMarker);
      });
    }

    // B. Render Corridors / Routes
    if (showRoutes) {
      filteredShipments.forEach((s) => {
        const originCoords = getCoordinatesForLocation(s.origin);
        const destCoords = getCoordinatesForLocation(s.destination);
        const truckCoords = getInterpolatedShipmentPosition(s);

        const isExcursion = s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature;
        const isWarning = s.currentTemperature >= 6.5 || s.riskLevel === 'HIGH';
        const isSelected = focusedShipmentId === s._id;

        const routeColor = isExcursion ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

        // Draw curved transit line with intermediate waypoint
        const midPoint: [number, number] = [
          (originCoords[0] + destCoords[0]) / 2 + (isSelected ? 0.04 : 0.02),
          (originCoords[1] + destCoords[1]) / 2 - (isSelected ? 0.04 : 0.02),
        ];

        // Completed segment (Origin to Truck)
        const completedLine = L.polyline([originCoords, truckCoords], {
          color: routeColor,
          weight: isSelected ? 4 : 3,
          opacity: 0.85,
          dashArray: '6, 6',
        });
        routesLayer.addLayer(completedLine);

        // Remaining segment (Truck to Destination)
        const remainingLine = L.polyline([truckCoords, destCoords], {
          color: isSelected ? routeColor : '#94a3b8',
          weight: isSelected ? 3 : 2,
          opacity: 0.5,
          dashArray: '3, 6',
        });
        routesLayer.addLayer(remainingLine);

        // Destination Pin
        const destPin = L.circleMarker(destCoords, {
          radius: isSelected ? 7 : 5,
          color: '#4f46e5',
          fillColor: '#818cf8',
          fillOpacity: 0.9,
          weight: 2,
        });
        destPin.bindTooltip(`Destination: ${s.destination} (${s.vaccineName})`, {
          direction: 'top',
          offset: [0, -8],
        });
        routesLayer.addLayer(destPin);
      });
    }

    // C. Render In-Transit Shipments / Trucks
    filteredShipments.forEach((s) => {
      const truckCoords = getInterpolatedShipmentPosition(s);
      const isSelected = focusedShipmentId === s._id;

      // Status classification
      const isExcursion = s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature;
      const isWarning = !isExcursion && (s.currentTemperature >= 6.5 || s.riskLevel === 'HIGH' || s.riskLevel === 'MODERATE');
      const isSafe = !isExcursion && !isWarning;

      // Color coding
      const statusColor = isExcursion ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
      const badgeBg = isExcursion
        ? 'linear-gradient(135deg, #991b1b, #ef4444)'
        : isWarning
        ? 'linear-gradient(135deg, #b45309, #f59e0b)'
        : 'linear-gradient(135deg, #065f46, #10b981)';

      const tempDisplay = `${s.currentTemperature > 0 ? '+' : ''}${s.currentTemperature.toFixed(1)}°C`;

      const truckIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer transition-all duration-300" style="transform: translate(-50%, -50%);">
            
            ${
              isExcursion
                ? `<div class="absolute w-14 h-14 rounded-full bg-red-500/30 animate-pulse-ring pointer-events-none"></div>`
                : isWarning
                ? `<div class="absolute w-12 h-12 rounded-full bg-amber-500/25 animate-pulse-ring pointer-events-none"></div>`
                : ''
            }

            <!-- Floating Live Temperature Pill -->
            <div class="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-tight shadow-md text-white whitespace-nowrap mb-1 flex items-center space-x-1.5 transition-transform group-hover:scale-105"
                 style="background: ${badgeBg};">
              <span class="w-2 h-2 rounded-full ${
                isExcursion ? 'bg-white animate-ping' : isWarning ? 'bg-white' : 'bg-emerald-200'
              }"></span>
              <span class="font-extrabold tracking-tight">${tempDisplay}</span>
              ${isExcursion ? '<span class="text-[9px]">⚠️ EXCURSION</span>' : isWarning ? '<span class="text-[9px]">WARM</span>' : ''}
            </div>

            <!-- Vehicle Icon Container -->
            <div class="relative w-11 h-11 rounded-2xl bg-white border-2 flex items-center justify-center shadow-xl transition-all duration-200 group-hover:scale-110 ${
              isSelected ? 'ring-4 ring-blue-500/50 scale-110 shadow-blue-500/30' : ''
            }"
                 style="border-color: ${statusColor};">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                   style="background: ${statusColor};">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                  <path d="M15 18H9"/>
                  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                  <circle cx="17" cy="18" r="2"/>
                  <circle cx="7" cy="18" r="2"/>
                </svg>
              </div>

              <!-- Status Dot -->
              <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-xs"
                    style="background: ${statusColor};">
                ${isExcursion ? '!' : isWarning ? '!' : '✓'}
              </span>
            </div>

            <!-- Label -->
            <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-[10px] text-white font-mono font-medium shadow-xs">
              ${s.trackingId}
            </div>
          </div>
        `,
        iconSize: [50, 60],
        iconAnchor: [25, 30],
      });

      const marker = L.marker(truckCoords, { icon: truckIcon, zIndexOffset: isSelected ? 1000 : 500 });
      const batteryInfo = calculateReeferBatteryStatus(s);

      // Interactive Popup with detailed actions
      marker.bindPopup(`
        <div class="p-4 max-w-[310px] text-slate-800">
          <!-- Header -->
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div class="flex items-center space-x-1.5">
              <span class="w-2 h-2 rounded-full" style="background: ${statusColor};"></span>
              <span class="font-bold text-xs text-slate-900 font-mono">${s.trackingId}</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono"
                  style="background: ${isExcursion ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7'}; color: ${statusColor};">
              ${s.status}
            </span>
          </div>

          <!-- Vaccine & Batch -->
          <div class="mb-3">
            <h4 class="font-bold text-sm text-slate-900 leading-tight">${s.vaccineName}</h4>
            <p class="text-xs text-slate-500 font-mono mt-0.5">Batch: ${s.batchNumber} • ${s.quantity.toLocaleString()} doses</p>
          </div>

          <!-- Live Temperature Status Gauge -->
          <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 mb-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Thermal Telemetry</span>
              <span class="text-xs font-bold font-mono ${isExcursion ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}">
                ${s.currentTemperature.toFixed(1)}°C
              </span>
            </div>

            <!-- WHO Cold Chain Bar Range 2°C - 8°C -->
            <div class="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-1">
              <div class="absolute left-[20%] right-[20%] top-0 bottom-0 bg-emerald-400/50" title="Safe Zone 2°C - 8°C"></div>
              <div class="absolute top-0 bottom-0 w-2 rounded-full shadow-sm"
                   style="left: calc(${Math.min(Math.max((s.currentTemperature / 12) * 100, 5), 95)}% - 4px); background: ${statusColor};"></div>
            </div>
            <div class="flex justify-between text-[9px] font-mono text-slate-400">
              <span>0°C</span>
              <span class="text-emerald-700 font-bold">2°C (Min)</span>
              <span class="text-emerald-700 font-bold">8°C (Max)</span>
              <span>12°C</span>
            </div>

            ${
              s.predictedExcursionMinutes > 0
                ? `<div class="mt-2 text-[11px] font-bold text-red-600 flex items-center space-x-1">
                     <span>⏱️ Predicted excursion breach in ${s.predictedExcursionMinutes} mins!</span>
                   </div>`
                : `<div class="mt-2 text-[10px] text-emerald-700 font-medium flex items-center space-x-1">
                     <span>✓ Thermal curve optimal within WHO buffer.</span>
                   </div>`
            }
          </div>

          <!-- Mobile Reefer Battery Diagnostic & Time-to-Empty Projections -->
          <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 mb-3 text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reefer Battery SoC</span>
              <span class="font-mono font-bold ${batteryInfo.batteryPercentage < 25 ? 'text-red-600' : batteryInfo.batteryPercentage < 50 ? 'text-amber-600' : 'text-emerald-600'}">
                🔋 ${batteryInfo.batteryPercentage}% (${batteryInfo.batteryVoltage}V)
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 font-mono">
              <span class="text-slate-500">Time-to-Empty (TTE):</span>
              <span class="font-bold ${batteryInfo.timeToEmptyHours < 3 && batteryInfo.dischargeRateAmps < 0 ? 'text-red-600' : 'text-slate-800'}">
                ${batteryInfo.dischargeRateAmps >= 0 ? 'Charging (Net +)' : `${Math.floor(batteryInfo.timeToEmptyHours)}h ${Math.round((batteryInfo.timeToEmptyHours % 1) * 60)}m`}
              </span>
            </div>
            ${batteryInfo.deficitHours > 0 && batteryInfo.dischargeRateAmps < 0 ? `
              <div class="mt-1.5 text-[10px] text-red-700 font-bold bg-red-100/80 p-1.5 rounded border border-red-200 leading-tight">
                ⚠️ Deficit Alert: Battery empties ~${batteryInfo.deficitHours}h before destination arrival!
              </div>
            ` : ''}
          </div>

          <!-- Route & Driver -->
          <div class="space-y-1 text-xs text-slate-600 mb-3 bg-white p-2 rounded-lg border border-slate-100">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Origin:</span>
              <span class="font-medium text-slate-800">${s.origin}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Destination:</span>
              <span class="font-medium text-slate-800">${s.destination}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Driver / Reefer:</span>
              <span class="font-medium text-slate-800">${s.driverName} (${s.vehicleReg.split(' ')[0]})</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Remaining Transit:</span>
              <span class="font-bold text-slate-800 font-mono">${s.remainingTravelTime} hrs</span>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="pt-2 border-t border-slate-100 flex flex-col space-y-1.5">
            <button onclick="window.vaxguardNavigateToShipment('${s._id}')"
                    class="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer">
              <span>Inspect Full Telemetry & Sensor Logs</span>
              <span>→</span>
            </button>
            <div class="flex space-x-1.5">
              <button onclick="window.vaxguardSimulateTemp('${s._id}', 0.8)"
                      class="flex-1 py-1 px-2 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer">
                <span>🔥 Rise +0.8°C</span>
              </button>
              <button onclick="window.vaxguardSimulateTemp('${s._id}', -0.8)"
                      class="flex-1 py-1 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer">
                <span>❄️ Cool -0.8°C</span>
              </button>
            </div>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setFocusedShipmentId(s._id);
        if (onSelectShipment) onSelectShipment(s);
      });

      markersLayer.addLayer(marker);
    });
  }, [filteredShipments, warehouses, showRoutes, showFacilities, focusedShipmentId]);

  // Expose global callback helpers for Leaflet HTML popups
  useEffect(() => {
    (window as any).vaxguardNavigateToShipment = (id: string) => {
      navigate(`/shipments/${id}`);
    };
    (window as any).vaxguardSimulateTemp = (id: string, delta: number) => {
      handleSimulateTemp(id, delta);
    };

    return () => {
      delete (window as any).vaxguardNavigateToShipment;
      delete (window as any).vaxguardSimulateTemp;
    };
  }, []);

  return (
    <div
      className={`relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      } ${className}`}
    >
      {/* Simulation Feedback Alert Toast */}
      {actionMessage && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-slate-900/95 text-white text-xs font-mono rounded-xl shadow-xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Header & Telemetry Controls */}
      {showControls && (
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3">
          {/* Title & Live Status Indicator */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Real-Time Cold-Chain Fleet Map
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visualizing active refrigerated fleet, temperature excursions, and regional cold depots across South India
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center space-x-2">
            <div className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-mono">
              <span className="text-slate-400 mr-1.5">FLEET:</span>
              <span className="font-bold text-slate-800">{fleetStats.total}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono">
              <span className="text-emerald-700 font-bold mr-1">SAFE:</span>
              <span className="font-extrabold text-emerald-800">{fleetStats.safeCount}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono">
              <span className="text-amber-700 font-bold mr-1">WARNING:</span>
              <span className="font-extrabold text-amber-800">{fleetStats.warningCount}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-mono">
              <span className="text-red-700 font-bold mr-1">EXCURSION:</span>
              <span className="font-extrabold text-red-800">{fleetStats.criticalCount}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono">
              <span className="text-blue-700 font-bold mr-1">AVG TEMP:</span>
              <span className="font-extrabold text-blue-800">{fleetStats.avgTemp}°C</span>
            </div>
          </div>

          {/* Actions & Refresh Toolbar */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefreshActive(!autoRefreshActive)}
              title={autoRefreshActive ? 'Pause auto-refresh' : 'Resume auto-refresh'}
              className={`p-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition cursor-pointer ${
                autoRefreshActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefreshActive ? 'animate-pulse text-emerald-600' : ''}`} />
              <span className="hidden sm:inline font-bold">
                {autoRefreshActive ? `${secondsUntilSync}s` : 'Paused'}
              </span>
            </button>

            <button
              onClick={fetchMapData}
              disabled={refreshing}
              title="Refresh telemetry now"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={fitFleetBounds}
              title="Fit map to fleet bounds"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Fit Fleet</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Layer Controls Bar */}
      {showControls && (
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
            <span className="text-slate-400 font-semibold mr-1 uppercase text-[10px] tracking-wider">Filter:</span>
            {[
              { id: 'ALL', label: 'All Fleet' },
              { id: 'SAFE', label: 'Safe 2-8°C' },
              { id: 'WARNING', label: 'Warning' },
              { id: 'CRITICAL', label: 'Excursions ⚠️' },
              { id: 'IN_TRANSIT', label: 'In Transit' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Layer Toggles */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-md border border-slate-200 text-xs w-36 sm:w-44 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <label className="flex items-center space-x-1 text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showRoutes}
                onChange={(e) => setShowRoutes(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium">Corridors</span>
            </label>

            <label className="flex items-center space-x-1 text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showFacilities}
                onChange={(e) => setShowFacilities(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium">Depots</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Map Container & Fleet Sidebar */}
      <div className="relative flex-1 w-full flex overflow-hidden" style={{ minHeight: height }}>
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[420px] bg-slate-100 z-10" />

        {/* Floating Quick Fleet Selector Overlay */}
        {!singleShipmentMode && (
          <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full pointer-events-none hidden md:block">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 shadow-xl pointer-events-auto max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Active Reefer Units ({filteredShipments.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Click to track</span>
              </div>

              <div className="space-y-1.5">
                {filteredShipments.map((s) => {
                  const isSelected = focusedShipmentId === s._id;
                  const isExcursion = s.currentTemperature > s.safeMaxTemperature || s.currentTemperature < s.safeMinTemperature;
                  const isWarning = !isExcursion && (s.currentTemperature >= 6.5 || s.riskLevel === 'HIGH');

                  return (
                    <div
                      key={s._id}
                      onClick={() => flyToShipment(s)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isExcursion ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <div>
                          <span className="font-bold font-mono text-slate-900 block leading-tight">{s.trackingId}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">
                            {s.origin} → {s.destination}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold block ${
                            isExcursion ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {s.currentTemperature.toFixed(1)}°C
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{s.remainingTravelTime}h left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-md text-[11px] font-mono text-slate-700 space-y-1 pointer-events-auto">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Safe (2.0°C - 6.5°C)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Warning (6.5°C - 8.0°C)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span>Critical Breach (&gt;8.0°C)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

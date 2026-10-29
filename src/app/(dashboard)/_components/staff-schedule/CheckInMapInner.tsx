"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

interface CheckInMapInnerProps {
  center: LatLng;
  radiusMeters: number | null;
  user: LatLng | null;
  allowed: boolean;
  style?: React.CSSProperties;
}

function pinIcon(background: string, glyph: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${background};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;line-height:1;
      box-shadow:0 4px 10px rgba(15,23,42,0.35);
      border:2px solid #fff;
    ">${glyph}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const CENTER_ICON = pinIcon("#6366f1", "🏫");
const USER_INSIDE_ICON = pinIcon("#10b981", "📍");
const USER_OUTSIDE_ICON = pinIcon("#ef4444", "📍");

function FitToMarkers({ center, user }: { center: LatLng; user: LatLng | null }) {
  const map = useMap();

  useEffect(() => {
    if (user) {
      const bounds = L.latLngBounds([center.lat, center.lng], [user.lat, user.lng]);
      map.fitBounds(bounds.pad(0.4), { maxZoom: 18, animate: true });
      return;
    }
    map.setView([center.lat, center.lng], 17);
  }, [map, center.lat, center.lng, user?.lat, user?.lng]);

  return null;
}

export default function CheckInMapInner({ center, radiusMeters, user, allowed, style }: CheckInMapInnerProps) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={17} scrollWheelZoom style={{ height: "100%", width: "100%", ...style }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {radiusMeters != null ? (
        <Circle center={[center.lat, center.lng]} radius={radiusMeters} pathOptions={{ color: "#6366f1", weight: 2, fillColor: "#6366f1", fillOpacity: 0.12 }} />
      ) : null}
      <Marker position={[center.lat, center.lng]} icon={CENTER_ICON} />
      {user ? <Marker position={[user.lat, user.lng]} icon={allowed ? USER_INSIDE_ICON : USER_OUTSIDE_ICON} /> : null}
      <FitToMarkers center={center} user={user} />
    </MapContainer>
  );
}

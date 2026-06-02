// ── Détection automatique des colonnes lat/lng ────────────────────────────────
export function detectLatLng(columns) {
  const find = (kws) =>
    columns.find(c => kws.some(k => c.toLowerCase().replace(/[_\s-]/g,'').includes(k))) || null;
  return {
    lat: find(['latitude','lat','ycoord','coordlat','ylat','coordonnee_y','coordy','coord_y','gps_lat','position_lat']),
    lng: find(['longitude','lng','lon','long','xcoord','coordlon','xlon','coordonnee_x','coordx','coord_x','gps_lon','position_lon','gps_lng']),
  };
}
/**
 * Shared route coordinates for the CHATCO transit line (Route W5 CTC).
 *
 * Used by:
 *   - components/admin/admin-commuter-map.tsx  (Leaflet polyline + vehicle placement)
 *   - app/(admin)/monitoring/data/data-monitoring.ts  (demand zones, SOS defaults)
 *
 * Source: Route stop list from CHATCO TSC (W5 CTC JEDS Island Res)
 * TODO: Replace with API call when Laravel backend is ready.
 */

/* ─── Full Route Polyline (Malolos → Angat) ─── */

export const ROUTE_COORDS: [number, number][] = [
  [14.925460996033356, 120.76512235423647], [14.92420402124189, 120.76528787872712],
  [14.920152600670095, 120.76571706129354], [14.915220582966443, 120.76619717003261],
  [14.901323759501945, 120.7719224852731], [14.886458903875173, 120.78596796657541],
  [14.874990764897628, 120.79618423260841], [14.87207763773181, 120.79878589058617],
  [14.865745283697539, 120.80435407290116], [14.860501402001871, 120.80901802051571],
  [14.85778433148678, 120.81163478600241], [14.855388331987022, 120.81368996254061],
  [14.852693386081329, 120.81600207219617], [14.851497406805521, 120.81765988586791],
  [14.849417900874624, 120.8235248577769], [14.845945790029823, 120.83422329239757],
  [14.844320234352493, 120.83905948176812], [14.842383282603786, 120.84506982184078],
  [14.841893283760905, 120.84698408093634], [14.840375174197046, 120.85413496987503],
  [14.839623777400517, 120.85750998638694], [14.838634008132473, 120.86201040680506],
  [14.8371385749864, 120.86297382674883], [14.83612807323988, 120.86333412418747],
  [14.835254069547146, 120.86366551171416], [14.833295288398967, 120.8661891975047],
  [14.8324975199314, 120.86740282879738], [14.831810284552892, 120.86868877790535],
  [14.83035944532852, 120.87094580599025], [14.828506904517909, 120.87400904071411],
  [14.828161518510791, 120.87659402671414], [14.828232464378223, 120.88095495481001],
  [14.828293590064265, 120.88426507598852], [14.828333307002257, 120.886565917288],
  [14.827864597760719, 120.89053477186802], [14.827464358080183, 120.89241460779954],
  [14.826703652032982, 120.89503763480697], [14.826129391774803, 120.89676317509107],
  [14.824720294651351, 120.89902058487867], [14.822990488146456, 120.90083394930517],
  [14.820845909007058, 120.90316146076532], [14.819825636767673, 120.90421208848784],
  [14.818163498638592, 120.90600984388941], [14.81713926187142, 120.90792339416925],
  [14.817003259236085, 120.90825980129833], [14.815860883789151, 120.90986972578348],
  [14.815234108397684, 120.91047524129526], [14.81440037604567, 120.91144161960287],
  [14.813099510668458, 120.91283614016609], [14.811588723108294, 120.91413585780512],
  [14.809543338082284, 120.9159455873501], [14.806525108118892, 120.91850689602882],
  [14.801946360221512, 120.92201682737273], [14.800215165075755, 120.9231979150914],
  [14.798804712598924, 120.92456195413324], [14.798451222604799, 120.92693781063585],
  [14.797677687963592, 120.92897276863408], [14.79630282892156, 120.92974647714638],
  [14.794082971006238, 120.9309174591896], [14.792193992873402, 120.9319309517239],
  [14.789984757130886, 120.93194351724061], [14.786542900321203, 120.93179853039794],
  [14.782758056853037, 120.93416554556896], [14.78116722012781, 120.93525425025881],
  [14.778139275650638, 120.93709526206992], [14.773104742636574, 120.93960422042926],
  [14.766525006702839, 120.94320546363049], [14.765525492192376, 120.94401383576125],
  [14.76072862621141, 120.94974045073359], [14.757057921030993, 120.95282600874056],
  [14.754092913022339, 120.95430633290394], [14.749614776242218, 120.95648776807238],
  [14.743004859115217, 120.95912082860627], [14.738243986091819, 120.96064278809952],
  [14.73118850798765, 120.96137476925526], [14.729202256905156, 120.96135109408412],
  [14.725646764905104, 120.9604838112117],
];

/* ─── Named Route Stops (W5 CTC — from CHATCO TSC) ─── */

export interface RouteStop {
  id: number;
  name: string;
  /** Coordinates — TODO: geocode each stop, currently null until API provides */
  coords: [number, number] | null;
}

export const ROUTE_STOPS: RouteStop[] = [
  { id: 1,  name: "Star Oil / Puregold Brgy Bato",           coords: null },
  { id: 2,  name: "Puregold Jr Aliw / Meycauayan",           coords: null },
  { id: 3,  name: "Pandayan",                                 coords: null },
  { id: 4,  name: "SM Marilao",                               coords: null },
  { id: 5,  name: "Marilao Public Market",                    coords: null },
  { id: 6,  name: "Toyota Marilao / Abangan Sur",            coords: null },
  { id: 7,  name: "Lolomboy / Bocaue Specialist",            coords: null },
  { id: 8,  name: "Petron Brgy Bonlo Bocaue",                coords: null },
  { id: 9,  name: "BDO Binang 1st Bocaue",                   coords: null },
  { id: 10, name: "Bocaue Public Market",                     coords: null },
  { id: 11, name: "Intercity Gate 1",                         coords: null },
  { id: 12, name: "Intercity Gate 2 Balagtas",               coords: null },
  { id: 13, name: "Balagtas Municipal Hall",                  coords: null },
  { id: 14, name: "STI Colleges Brgy Burol 1st",             coords: null },
  { id: 15, name: "Tuktukan Gas Station Guiguinto",          coords: null },
  { id: 16, name: "Guiguinto Cruz / Puregold Guiguinto",     coords: null },
  { id: 17, name: "Waltermart Guiguinto",                    coords: null },
  { id: 18, name: "Tesda / Estrella",                         coords: null },
  { id: 19, name: "Tabang / Tulay Guiguinto",                coords: null },
  { id: 20, name: "Tikang Elementary School Malolos",        coords: null },
  { id: 21, name: "San Pablo Malolos / Crossing",            coords: null },
  { id: 22, name: "Paradise / Marcelo / SNR",                coords: null },
  { id: 23, name: "STI / Dakila",                             coords: null },
  { id: 24, name: "Sunlife Malolos Crossing Brgy",          coords: null },
  { id: 25, name: "BSU / Capitolyo",                          coords: null },
  { id: 26, name: "Builders Warehouse Brgy Alido",           coords: null },
  { id: 27, name: "Central Escolar CEU School Malolos",      coords: null },
  { id: 28, name: "MBB Royal Hardware Brgy Longos",         coords: null },
  { id: 29, name: "Wilcon Depot / Brgy Pio Calumpit",       coords: null },
  { id: 30, name: "San Marcos / Brgy Pio Cruzcruz",         coords: null },
  { id: 31, name: "Petron Gas Station Brgy Bagbag",         coords: null },
  { id: 32, name: "Labangan Bridge Calumpit",               coords: null },
  { id: 33, name: "Calumpit Crossing Jollibee",             coords: null },
  { id: 34, name: "JEDS Island Resort",                      coords: null },
];

/* ─── Default Demand Zones (fallback until API provides) ─── */

export const DEFAULT_DEMAND_ZONES = [
  { id: "zone-1", coords: [14.88645, 120.78596] as [number, number], radiusMeters: 400, commuterCount: 120, intensity: "HIGH" as const },
  { id: "zone-2", coords: [14.84941, 120.82352] as [number, number], radiusMeters: 300, commuterCount: 85,  intensity: "MEDIUM" as const },
  { id: "zone-3", coords: [14.81816, 120.906]   as [number, number], radiusMeters: 500, commuterCount: 150, intensity: "HIGH" as const },
  { id: "zone-4", coords: [14.77813, 120.93709] as [number, number], radiusMeters: 250, commuterCount: 40,  intensity: "LOW" as const },
  { id: "zone-5", coords: [14.743,   120.95912] as [number, number], radiusMeters: 350, commuterCount: 95,  intensity: "MEDIUM" as const },
];
export interface CemeteryInfo {
  name: string;
  city: string;
  region: string;
  address: string;
  lat: number;
  lng: number;
}

export const bayCemeteries: CemeteryInfo[] = [
  // Peninsula & San Francisco
  { name: "Cypress Lawn Memorial Park", city: "Colma", region: "Peninsula & SF", address: "1370 El Camino Real, Colma, CA 94014", lat: 37.6769, lng: -122.4525 },
  { name: "Greek Orthodox Cemetery", city: "Colma", region: "Peninsula & SF", address: "1148 El Camino Real, Colma, CA 94014", lat: 37.6748, lng: -122.4540 },
  { name: "Greenlawn Memorial Park", city: "Colma", region: "Peninsula & SF", address: "1100 El Camino Real, Colma, CA 94014", lat: 37.6742, lng: -122.4548 },
  { name: "Italian Cemetery", city: "Colma", region: "Peninsula & SF", address: "540 F Street, Colma, CA 94014", lat: 37.6771, lng: -122.4597 },
  { name: "Olivet Memorial Park", city: "Colma", region: "Peninsula & SF", address: "1601 Hillside Boulevard, Colma, CA 94014", lat: 37.6714, lng: -122.4476 },
  { name: "Woodlawn Memorial Park", city: "Colma", region: "Peninsula & SF", address: "1000 El Camino Real, Colma, CA 94014", lat: 37.6735, lng: -122.4555 },
  { name: "San Francisco Columbarium", city: "San Francisco", region: "Peninsula & SF", address: "1 Loraine Court, San Francisco, CA 94118", lat: 37.7785, lng: -122.4569 },
  { name: "Skylawn Memorial Park", city: "San Mateo", region: "Peninsula & SF", address: "10300 Skyline Boulevard, San Mateo, CA 94402", lat: 37.5511, lng: -122.3368 },

  // South Bay & Central Valley
  { name: "Los Gatos Memorial Park", city: "San Jose", region: "South Bay", address: "2255 Los Gatos Almaden Road, San Jose, CA 95124", lat: 37.2562, lng: -121.9408 },
  { name: "Santa Clara Mission Cemetery", city: "Santa Clara", region: "South Bay", address: "490 Lincoln Street, Santa Clara, CA 95050", lat: 37.3510, lng: -121.9410 },
  { name: "Oak Hill Memorial Park", city: "San Jose", region: "South Bay", address: "300 Curtner Avenue, San Jose, CA 95125", lat: 37.3010, lng: -121.8710 },
  { name: "Mt. Hope Memorial Park", city: "Morgan Hill", region: "South Bay", address: "250 Spring Avenue, Morgan Hill, CA 95037", lat: 37.1280, lng: -121.6520 },
  { name: "Gavilan Hills Memorial Park", city: "Gilroy", region: "South Bay", address: "1000 First Street, Gilroy, CA 95020", lat: 37.0060, lng: -121.5680 },
  { name: "Oakwood Memorial Park", city: "Santa Cruz", region: "South Bay", address: "3301 Paul Sweet Road, Santa Cruz, CA 95065", lat: 36.9850, lng: -122.0050 },
  { name: "Santa Cruz Memorial", city: "Santa Cruz", region: "South Bay", address: "1927 Ocean Street Extension, Santa Cruz, CA 95060", lat: 36.9670, lng: -122.0200 },
  { name: "Pajaro Hills Memorial Park", city: "Watsonville", region: "South Bay", address: "127 Hecker Pass Road, Watsonville, CA 95076", lat: 36.9150, lng: -121.7620 },
  { name: "Mission Memorial Park", city: "Seaside", region: "South Bay", address: "1915 Ord Grove Avenue, Seaside, CA 93955", lat: 36.6120, lng: -121.8520 },
  { name: "Mountain View Cemetery (Fresno)", city: "Fresno", region: "South Bay", address: "1411 West Belmont Avenue, Fresno, CA 93728", lat: 36.7620, lng: -119.8020 },

  // East Bay
  { name: "All Souls Cemetery", city: "Vallejo", region: "East Bay", address: "550 Glen Cove Road, Vallejo, CA 94591", lat: 38.0965, lng: -122.2215 },
  { name: "Garden of Memory", city: "Concord", region: "East Bay", address: "2011 Arnold Industrial Way, Concord, CA 94520", lat: 37.9850, lng: -122.0350 },
  { name: "Cedar Lawn Memorial Park", city: "Fremont", region: "East Bay", address: "48800 Warm Springs Boulevard, Fremont, CA 94539", lat: 37.4880, lng: -121.9290 },
  { name: "Chapel of Christ the Light", city: "Oakland", region: "East Bay", address: "2121 Harrison Street, Oakland, CA 94612", lat: 37.8013, lng: -122.2638 },
  { name: "Chapel of the Chimes (Hayward)", city: "Hayward", region: "East Bay", address: "32992 Mission Boulevard, Hayward, CA 94544", lat: 37.6405, lng: -122.0520 },
  { name: "Chapel of the Chimes (Oakland)", city: "Oakland", region: "East Bay", address: "4499 Piedmont Avenue, Oakland, CA 94611", lat: 37.8355, lng: -122.2458 },
  { name: "Chapel of Memories", city: "Oakland", region: "East Bay", address: "4401 Howe Street, Oakland, CA 94611", lat: 37.8340, lng: -122.2280 },
  { name: "Evergreen Cemetery", city: "Oakland", region: "East Bay", address: "6450 Camden Street, Oakland, CA 94605", lat: 37.7680, lng: -122.1730 },
  { name: "Holy Sepulchre Cemetery", city: "Hayward", region: "East Bay", address: "1051 Harder Road, Hayward, CA 94542", lat: 37.6490, lng: -122.0610 },
  { name: "Hull's Chapel", city: "Walnut Creek", region: "East Bay", address: "1139 Saranap Avenue, Walnut Creek, CA 94595", lat: 37.8820, lng: -122.0730 },
  { name: "Irvington Memorial Cemetery", city: "Fremont", region: "East Bay", address: "41001 Chapel Way, Fremont, CA 94538", lat: 37.5230, lng: -121.9640 },
  { name: "Lone Tree Cemetery", city: "Hayward", region: "East Bay", address: "24591 Fairview Avenue, Hayward, CA 94542", lat: 37.6570, lng: -122.0560 },
  { name: "Memory Garden", city: "Livermore", region: "East Bay", address: "3873 East Avenue, Livermore, CA 94550", lat: 37.6830, lng: -121.7350 },
  { name: "Mountain View Cemetery", city: "Oakland", region: "East Bay", address: "5000 Piedmont Avenue, Oakland, CA 94611", lat: 37.8380, lng: -122.2405 },
  { name: "Oak View Memorial Park", city: "Antioch", region: "East Bay", address: "2500 East 18th Street, Antioch, CA 94509", lat: 38.0020, lng: -121.7850 },
  { name: "Oakmont Memorial Park", city: "Lafayette", region: "East Bay", address: "2099 Reliez Valley Road, Lafayette, CA 94549", lat: 37.8920, lng: -122.1240 },
  { name: "Queen of Heaven Cemetery", city: "Lafayette", region: "East Bay", address: "1965 Reliez Valley Road, Lafayette, CA 94549", lat: 37.8900, lng: -122.1210 },
  { name: "Rolling Hills Memorial Park", city: "Richmond", region: "East Bay", address: "4100 Hilltop Drive, Richmond, CA 94803", lat: 37.9610, lng: -122.3310 },
  { name: "Skyview Memorial Park", city: "Vallejo", region: "East Bay", address: "200 Rollingwood Drive, Vallejo, CA 94591", lat: 38.1120, lng: -122.2410 },
  { name: "St. Augustine Cemetery", city: "Pleasanton", region: "East Bay", address: "Ray Street, Pleasanton, CA 94566", lat: 37.6620, lng: -121.8750 },
  { name: "St. Joseph Cemetery", city: "San Pablo", region: "East Bay", address: "2540 Church Lane, San Pablo, CA 94806", lat: 37.9610, lng: -122.3450 },
  { name: "St. Mary's Cemetery", city: "Oakland", region: "East Bay", address: "4529 Howe Street, Oakland, CA 94611", lat: 37.8345, lng: -122.2270 },
  { name: "St. Michael's Cemetery", city: "Livermore", region: "East Bay", address: "3885 East Avenue, Livermore, CA 94550", lat: 37.6835, lng: -121.7340 },
  { name: "Sunrise Memorial Cemetery", city: "Vallejo", region: "East Bay", address: "2225 Broadway Street, Vallejo, CA 94589", lat: 38.1180, lng: -122.2530 },
  { name: "Sunset View Memorial Park", city: "El Cerrito", region: "East Bay", address: "101 Colusa Avenue, El Cerrito, CA 94530", lat: 37.9150, lng: -122.3100 },

  // North Bay
  { name: "Chapel of the Chimes (Santa Rosa)", city: "Santa Rosa", region: "North Bay", address: "2601 Santa Rosa Avenue, Santa Rosa, CA 95407", lat: 38.4190, lng: -122.7050 },
  { name: "Cypress Hill Memorial Park", city: "Petaluma", region: "North Bay", address: "430 Magnolia Avenue, Petaluma, CA 94952", lat: 38.2310, lng: -122.6370 },
  { name: "Mt. Tamalpais Memorial Park", city: "San Rafael", region: "North Bay", address: "2500 Fifth Avenue, San Rafael, CA 94901", lat: 37.9690, lng: -122.5250 },
  { name: "Fernwood Natural Cemetery", city: "Mill Valley", region: "North Bay", address: "301 Tennessee Valley Road, Mill Valley, CA 94941", lat: 37.8680, lng: -122.5480 },
  { name: "Mission Memorial (Napa)", city: "Napa", region: "North Bay", address: "2383 Napa Vallejo Highway, Napa, CA 94558", lat: 38.2730, lng: -122.2840 },
  { name: "Napa Valley Memorial Park", city: "Napa", region: "North Bay", address: "2383 Napa Vallejo Highway, Napa, CA 94558", lat: 38.2730, lng: -122.2840 },
  { name: "Santa Rosa Memorial Park", city: "Santa Rosa", region: "North Bay", address: "1900 Franklin Avenue, Santa Rosa, CA 95404", lat: 38.4520, lng: -122.7050 },
  { name: "Shiloh Addition (SRMP)", city: "Windsor", region: "North Bay", address: "1750 Shiloh Road, Windsor, CA 95492", lat: 38.5230, lng: -122.7840 },
];

export const regions = ["All", "Peninsula & SF", "South Bay", "East Bay", "North Bay"];
export const plotTypes = ["All", "Single Plot", "Double Plot", "Niche", "Crypt"];

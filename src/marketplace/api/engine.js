import { CATEGORIES } from "../../utils";

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const USER_LAT = 17.4000;
const USER_LNG = 78.4500;

export const getNearDistance = (shop) => {
  if (!shop?.geoLocation) return (Math.random() * 10 + 1).toFixed(1);
  return getDistanceFromLatLonInKm(USER_LAT, USER_LNG, shop.geoLocation.lat, shop.geoLocation.lng).toFixed(1);
};

function normalizeStr(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query, target) {
  const nq = normalizeStr(query);
  const nt = normalizeStr(target);
  if (!nq || !nt) return false;

  if (nt.includes(nq)) return true;

  const qWords = nq.split(" ");
  const tWords = nt.split(" ");
  let matchedWords = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      if (tw.includes(qw) || qw.includes(tw)) { matchedWords++; break; }
      const maxLen = Math.max(qw.length, tw.length);
      if (maxLen >= 3 && levenshtein(qw, tw) <= Math.floor(maxLen * 0.3)) { matchedWords++; break; }
    }
  }
  return matchedWords >= Math.ceil(qWords.length * 0.6);
}

export function getSuggestions(query, products) {
  if (!query || query.length < 2 || !products) return [];
  const nq = normalizeStr(query);
  const seen = new Set();
  const suggestions = [];

  const allTerms = [];
  products.forEach(p => {
    [p.name, p.brand, p.category, p.sku].forEach(t => {
      if (t) allTerms.push(t);
    });
  });

  for (const term of allTerms) {
    const nt = normalizeStr(term);
    if (seen.has(nt)) continue;
    const dist = levenshtein(nq, nt.slice(0, nq.length + 2));
    if (dist > 0 && dist <= 2 && !nt.includes(nq)) {
      seen.add(nt);
      suggestions.push(term);
    }
  }
  return suggestions.slice(0, 3);
}

const POPULAR_SEARCHES = ["brake pad", "oil filter", "spark plug", "air filter", "clutch kit", "battery", "wiper blade", "shock absorber"];

export const rankingEngine = (allProducts, allShops, vehicleCtx = null) => {
  if (!allProducts || !allShops) return [];

  const groupedProducts = allProducts.reduce((acc, p) => {
    const key = p.sku || p.name;
    if (!acc[key]) {
      acc[key] = {
        masterTemplate: { ...p },
        listings: []
      };
    }
    const shop = allShops.find(s => s.id === p.shopId);
    if (!shop) return acc;

    acc[key].listings.push({
      ...p,
      shop,
      distance: parseFloat(getNearDistance(shop))
    });
    return acc;
  }, {});

  const vehicleId = vehicleCtx ? `${vehicleCtx.brand} ${vehicleCtx.model}` : null;

  return Object.values(groupedProducts).map(group => {
    const mp = group.masterTemplate;

    const listings = group.listings.sort((a, b) => a.sellPrice - b.sellPrice);
    if (listings.length === 0) return null;

    const bestListing = listings[0];

    let exactMatch = 0;
    let fitmentType = "none";
    if (vehicleId && mp.compatibleVehicles) {
      if (mp.compatibleVehicles.some(v => v.includes("Universal"))) {
        exactMatch = 80;
        fitmentType = "universal";
      } else if (mp.compatibleVehicles.some(v => v.includes(vehicleId) || vehicleId.includes(v))) {
        exactMatch = 100;
        fitmentType = "exact";
      }
    } else if (!vehicleId && mp.compatibleVehicles) {
      fitmentType = "unknown";
    }

    const velocityScore = Math.min((listings.reduce((sum, l) => sum + (100 - l.stock), 0) / 100) * 100, 100);
    const ratingScore = (bestListing.shop.rating / 5) * 100 || 80;
    const proxScore = Math.max(0, 100 - (bestListing.distance / 15 * 100));

    let stockScore = 0;
    const totalAvail = bestListing.stock - (bestListing.reservedStock || 0);
    if (totalAvail > bestListing.minStock) stockScore = 100;
    else if (totalAvail > 0) stockScore = 50;

    let rankScore = 0;
    if (vehicleId) {
      rankScore = (exactMatch * 0.4) + (velocityScore * 0.2) + (ratingScore * 0.15) + (proxScore * 0.15) + (stockScore * 0.1);
    } else {
      rankScore = (velocityScore * 0.4) + (ratingScore * 0.3) + (proxScore * 0.2) + (stockScore * 0.1);
    }

    return {
      product: mp,
      listings: listings.map(l => ({
        product_id: l.id,
        shop_id: l.shop.id,
        shop: l.shop,
        distance: l.distance,
        selling_price: l.sellPrice,
        mrp: l.mrp || (l.sellPrice * 1.2),
        stock_quantity: l.stock - (l.reservedStock || 0),
        min_stock: l.minStock,
        delivery_time: l.distance < 5 ? "Same Day" : "Next Day",
        discount: l.mrp ? Math.round(((l.mrp - l.sellPrice) / l.mrp) * 100) : 0
      })),
      bestPrice: bestListing.sellPrice,
      availability: listings.reduce((sum, l) => sum + (l.stock - (l.reservedStock || 0)), 0),
      shopCount: listings.length,
      fastestEta: listings[0].distance < 5 ? "Same Day" : "Next Day",
      rankScore: parseFloat(rankScore.toFixed(2)),
      isCompatible: exactMatch >= 80,
      fitmentType,
    };
  }).filter(Boolean).sort((a, b) => b.rankScore - a.rankScore);
};

export const getHomeData = (products, shops, vehicleCtx = null) => {
  const allRanked = rankingEngine(products, shops, vehicleCtx);

  if (vehicleCtx) {
    return {
      compatibleParts: allRanked.filter(p => p.isCompatible)
    };
  }

  return {
    topSelling: [...allRanked].slice(0, 10),
    trendingNearYou: [...allRanked].sort((a, b) => a.listings[0].distance - b.listings[0].distance).slice(0, 10),
    bestDeals: [...allRanked].sort((a, b) => b.listings[0].discount - a.listings[0].discount).filter(p => p.listings[0].discount > 0).slice(0, 5),
    popularCategories: CATEGORIES.slice(0, 6)
  };
};

export const searchEngine = (query, products, shops, vehicleCtx = null) => {
  if (!query || query.length < 2 || !products || !shops) return { products: [], categories: [], shops: [], suggestions: [], popularFallback: [] };

  const q = query.toLowerCase();

  const matchedCategories = CATEGORIES.filter(c => fuzzyMatch(query, c));
  const matchedShops = shops.filter(s => fuzzyMatch(query, s.name) || fuzzyMatch(query, s.id));

  const productMatches = products.filter(p =>
    fuzzyMatch(query, p.name) ||
    fuzzyMatch(query, p.brand) ||
    fuzzyMatch(query, p.sku) ||
    fuzzyMatch(query, p.category)
  );

  const rankedProducts = rankingEngine(productMatches, shops, vehicleCtx);

  const suggestions = rankedProducts.length === 0 ? getSuggestions(query, products) : [];

  const popularFallback = rankedProducts.length === 0
    ? POPULAR_SEARCHES.filter(s => !normalizeStr(s).includes(normalizeStr(query)))
    : [];

  return {
    products: rankedProducts.slice(0, 8),
    categories: matchedCategories,
    shops: matchedShops,
    suggestions,
    popularFallback: popularFallback.slice(0, 4),
  };
};

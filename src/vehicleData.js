// ===== STRUCTURED VEHICLE DATABASE =====
// Tables: MANUFACTURERS → MODELS → Years (derived from model year ranges)
// NOT hardcoded in frontend components — imported as structured data.

// ─── MANUFACTURERS TABLE ───
export const MANUFACTURERS = [
    { id: "maruti", name: "Maruti Suzuki", country: "India/Japan", logo: "🔵" },
    { id: "hyundai", name: "Hyundai", country: "South Korea", logo: "🔷" },
    { id: "tata", name: "Tata", country: "India", logo: "🟦" },
    { id: "mahindra", name: "Mahindra", country: "India", logo: "🔴" },
    { id: "toyota", name: "Toyota", country: "Japan", logo: "🔶" },
    { id: "honda", name: "Honda", country: "Japan", logo: "⬜" },
    { id: "kia", name: "Kia", country: "South Korea", logo: "🟥" },
    { id: "mg", name: "MG", country: "UK/China", logo: "🟢" },
    { id: "skoda", name: "Skoda", country: "Czech", logo: "🟩" },
    { id: "vw", name: "Volkswagen", country: "Germany", logo: "🔵" },
    { id: "renault", name: "Renault", country: "France", logo: "🟡" },
    { id: "nissan", name: "Nissan", country: "Japan", logo: "⚪" },
    { id: "ford", name: "Ford", country: "USA", logo: "🔵" },
    { id: "chevrolet", name: "Chevrolet", country: "USA", logo: "🟡" },
    { id: "bmw", name: "BMW", country: "Germany", logo: "⬛" },
    { id: "mercedes", name: "Mercedes-Benz", country: "Germany", logo: "⬛" },
    { id: "audi", name: "Audi", country: "Germany", logo: "⬛" },
    { id: "jeep", name: "Jeep", country: "USA", logo: "🟤" },
    { id: "volvo", name: "Volvo", country: "Sweden", logo: "🔷" },
    { id: "isuzu", name: "Isuzu", country: "Japan", logo: "🔴" },
];

// ─── MODELS TABLE ───
// Each model has: id, manufacturerId, name, yearFrom, yearTo
export const MODELS = [
    // ── Maruti Suzuki ──
    { id: "swift", mfgId: "maruti", name: "Swift", yearFrom: 2005, yearTo: 2025 },
    { id: "dzire", mfgId: "maruti", name: "Dzire", yearFrom: 2008, yearTo: 2025 },
    { id: "baleno", mfgId: "maruti", name: "Baleno", yearFrom: 2015, yearTo: 2025 },
    { id: "wagonr", mfgId: "maruti", name: "Wagon R", yearFrom: 2010, yearTo: 2025 },
    { id: "alto", mfgId: "maruti", name: "Alto", yearFrom: 2000, yearTo: 2025 },
    { id: "altok10", mfgId: "maruti", name: "Alto K10", yearFrom: 2010, yearTo: 2025 },
    { id: "brezza", mfgId: "maruti", name: "Brezza", yearFrom: 2016, yearTo: 2025 },
    { id: "ertiga", mfgId: "maruti", name: "Ertiga", yearFrom: 2012, yearTo: 2025 },
    { id: "xl6", mfgId: "maruti", name: "XL6", yearFrom: 2019, yearTo: 2025 },
    { id: "ciaz", mfgId: "maruti", name: "Ciaz", yearFrom: 2014, yearTo: 2023 },
    { id: "ignis", mfgId: "maruti", name: "Ignis", yearFrom: 2017, yearTo: 2025 },
    { id: "celerio", mfgId: "maruti", name: "Celerio", yearFrom: 2014, yearTo: 2025 },
    { id: "scross", mfgId: "maruti", name: "S-Cross", yearFrom: 2015, yearTo: 2022 },
    { id: "eeco", mfgId: "maruti", name: "Eeco", yearFrom: 2010, yearTo: 2025 },
    { id: "grandvitara", mfgId: "maruti", name: "Grand Vitara", yearFrom: 2022, yearTo: 2025 },
    { id: "fronx", mfgId: "maruti", name: "Fronx", yearFrom: 2023, yearTo: 2025 },
    { id: "jimny", mfgId: "maruti", name: "Jimny", yearFrom: 2023, yearTo: 2025 },
    { id: "invicto", mfgId: "maruti", name: "Invicto", yearFrom: 2023, yearTo: 2025 },

    // ── Hyundai ──
    { id: "i20", mfgId: "hyundai", name: "i20", yearFrom: 2008, yearTo: 2025 },
    { id: "creta", mfgId: "hyundai", name: "Creta", yearFrom: 2015, yearTo: 2025 },
    { id: "venue", mfgId: "hyundai", name: "Venue", yearFrom: 2019, yearTo: 2025 },
    { id: "verna", mfgId: "hyundai", name: "Verna", yearFrom: 2006, yearTo: 2025 },
    { id: "i10", mfgId: "hyundai", name: "Grand i10 Nios", yearFrom: 2013, yearTo: 2025 },
    { id: "aura", mfgId: "hyundai", name: "Aura", yearFrom: 2020, yearTo: 2025 },
    { id: "tucson", mfgId: "hyundai", name: "Tucson", yearFrom: 2016, yearTo: 2025 },
    { id: "alcazar", mfgId: "hyundai", name: "Alcazar", yearFrom: 2021, yearTo: 2025 },
    { id: "exter", mfgId: "hyundai", name: "Exter", yearFrom: 2023, yearTo: 2025 },
    { id: "santro", mfgId: "hyundai", name: "Santro", yearFrom: 2003, yearTo: 2022 },
    { id: "xcent", mfgId: "hyundai", name: "Xcent", yearFrom: 2014, yearTo: 2020 },
    { id: "kona_ev", mfgId: "hyundai", name: "Kona EV", yearFrom: 2019, yearTo: 2024 },
    { id: "ioniq5", mfgId: "hyundai", name: "Ioniq 5", yearFrom: 2022, yearTo: 2025 },

    // ── Tata ──
    { id: "nexon", mfgId: "tata", name: "Nexon", yearFrom: 2017, yearTo: 2025 },
    { id: "punch", mfgId: "tata", name: "Punch", yearFrom: 2021, yearTo: 2025 },
    { id: "harrier", mfgId: "tata", name: "Harrier", yearFrom: 2019, yearTo: 2025 },
    { id: "safari", mfgId: "tata", name: "Safari", yearFrom: 2021, yearTo: 2025 },
    { id: "altroz", mfgId: "tata", name: "Altroz", yearFrom: 2020, yearTo: 2025 },
    { id: "tiago", mfgId: "tata", name: "Tiago", yearFrom: 2016, yearTo: 2025 },
    { id: "tigor", mfgId: "tata", name: "Tigor", yearFrom: 2017, yearTo: 2025 },
    { id: "nexon_ev", mfgId: "tata", name: "Nexon EV", yearFrom: 2020, yearTo: 2025 },
    { id: "tiago_ev", mfgId: "tata", name: "Tiago EV", yearFrom: 2022, yearTo: 2025 },
    { id: "curvv", mfgId: "tata", name: "Curvv", yearFrom: 2024, yearTo: 2025 },
    { id: "indica", mfgId: "tata", name: "Indica", yearFrom: 2008, yearTo: 2018 },

    // ── Mahindra ──
    { id: "thar", mfgId: "mahindra", name: "Thar", yearFrom: 2010, yearTo: 2025 },
    { id: "xuv700", mfgId: "mahindra", name: "XUV700", yearFrom: 2021, yearTo: 2025 },
    { id: "xuv300", mfgId: "mahindra", name: "XUV 3XO", yearFrom: 2019, yearTo: 2025 },
    { id: "scorpio", mfgId: "mahindra", name: "Scorpio N", yearFrom: 2022, yearTo: 2025 },
    { id: "scorpio_cl", mfgId: "mahindra", name: "Scorpio Classic", yearFrom: 2002, yearTo: 2025 },
    { id: "bolero", mfgId: "mahindra", name: "Bolero", yearFrom: 2001, yearTo: 2025 },
    { id: "xuv400", mfgId: "mahindra", name: "XUV400 EV", yearFrom: 2023, yearTo: 2025 },
    { id: "marazzo", mfgId: "mahindra", name: "Marazzo", yearFrom: 2018, yearTo: 2023 },
    { id: "xylo", mfgId: "mahindra", name: "Xylo", yearFrom: 2009, yearTo: 2019 },
    { id: "kuv100", mfgId: "mahindra", name: "KUV100", yearFrom: 2016, yearTo: 2021 },

    // ── Toyota ──
    { id: "innova", mfgId: "toyota", name: "Innova Crysta", yearFrom: 2005, yearTo: 2025 },
    { id: "innova_hycross", mfgId: "toyota", name: "Innova Hycross", yearFrom: 2023, yearTo: 2025 },
    { id: "fortuner", mfgId: "toyota", name: "Fortuner", yearFrom: 2009, yearTo: 2025 },
    { id: "glanza", mfgId: "toyota", name: "Glanza", yearFrom: 2019, yearTo: 2025 },
    { id: "urban_cruiser", mfgId: "toyota", name: "Urban Cruiser Hyryder", yearFrom: 2022, yearTo: 2025 },
    { id: "hilux", mfgId: "toyota", name: "Hilux", yearFrom: 2022, yearTo: 2025 },
    { id: "etios", mfgId: "toyota", name: "Etios", yearFrom: 2010, yearTo: 2022 },
    { id: "camry", mfgId: "toyota", name: "Camry", yearFrom: 2007, yearTo: 2025 },
    { id: "vellfire", mfgId: "toyota", name: "Vellfire", yearFrom: 2020, yearTo: 2025 },
    { id: "land_cruiser", mfgId: "toyota", name: "Land Cruiser", yearFrom: 2010, yearTo: 2025 },

    // ── Honda ──
    { id: "city", mfgId: "honda", name: "City", yearFrom: 2003, yearTo: 2025 },
    { id: "amaze", mfgId: "honda", name: "Amaze", yearFrom: 2013, yearTo: 2025 },
    { id: "elevate", mfgId: "honda", name: "Elevate", yearFrom: 2023, yearTo: 2025 },
    { id: "wrv", mfgId: "honda", name: "WR-V", yearFrom: 2017, yearTo: 2023 },
    { id: "jazz", mfgId: "honda", name: "Jazz", yearFrom: 2009, yearTo: 2023 },
    { id: "civic", mfgId: "honda", name: "Civic", yearFrom: 2006, yearTo: 2020 },
    { id: "crv", mfgId: "honda", name: "CR-V", yearFrom: 2004, yearTo: 2023 },
    { id: "brv", mfgId: "honda", name: "BR-V", yearFrom: 2016, yearTo: 2022 },

    // ── Kia ──
    { id: "seltos", mfgId: "kia", name: "Seltos", yearFrom: 2019, yearTo: 2025 },
    { id: "sonet", mfgId: "kia", name: "Sonet", yearFrom: 2020, yearTo: 2025 },
    { id: "carens", mfgId: "kia", name: "Carens", yearFrom: 2022, yearTo: 2025 },
    { id: "ev6", mfgId: "kia", name: "EV6", yearFrom: 2022, yearTo: 2025 },
    { id: "carnival", mfgId: "kia", name: "Carnival", yearFrom: 2020, yearTo: 2025 },
    { id: "ev9", mfgId: "kia", name: "EV9", yearFrom: 2024, yearTo: 2025 },

    // ── MG ──
    { id: "hector", mfgId: "mg", name: "Hector", yearFrom: 2019, yearTo: 2025 },
    { id: "astor", mfgId: "mg", name: "Astor", yearFrom: 2021, yearTo: 2025 },
    { id: "zsev", mfgId: "mg", name: "ZS EV", yearFrom: 2020, yearTo: 2025 },
    { id: "gloster", mfgId: "mg", name: "Gloster", yearFrom: 2020, yearTo: 2025 },
    { id: "comet", mfgId: "mg", name: "Comet EV", yearFrom: 2023, yearTo: 2025 },
    { id: "hector_plus", mfgId: "mg", name: "Hector Plus", yearFrom: 2020, yearTo: 2025 },

    // ── Skoda ──
    { id: "kushaq", mfgId: "skoda", name: "Kushaq", yearFrom: 2021, yearTo: 2025 },
    { id: "slavia", mfgId: "skoda", name: "Slavia", yearFrom: 2022, yearTo: 2025 },
    { id: "superb", mfgId: "skoda", name: "Superb", yearFrom: 2009, yearTo: 2023 },
    { id: "rapid", mfgId: "skoda", name: "Rapid", yearFrom: 2011, yearTo: 2022 },
    { id: "octavia", mfgId: "skoda", name: "Octavia", yearFrom: 2005, yearTo: 2025 },
    { id: "kodiaq", mfgId: "skoda", name: "Kodiaq", yearFrom: 2017, yearTo: 2025 },

    // ── Volkswagen ──
    { id: "taigun", mfgId: "vw", name: "Taigun", yearFrom: 2021, yearTo: 2025 },
    { id: "virtus", mfgId: "vw", name: "Virtus", yearFrom: 2022, yearTo: 2025 },
    { id: "polo", mfgId: "vw", name: "Polo", yearFrom: 2010, yearTo: 2022 },
    { id: "vento", mfgId: "vw", name: "Vento", yearFrom: 2010, yearTo: 2022 },
    { id: "tiguan", mfgId: "vw", name: "Tiguan", yearFrom: 2017, yearTo: 2025 },

    // ── Renault ──
    { id: "kwid", mfgId: "renault", name: "Kwid", yearFrom: 2015, yearTo: 2025 },
    { id: "triber", mfgId: "renault", name: "Triber", yearFrom: 2019, yearTo: 2025 },
    { id: "kiger", mfgId: "renault", name: "Kiger", yearFrom: 2021, yearTo: 2025 },
    { id: "duster", mfgId: "renault", name: "Duster", yearFrom: 2012, yearTo: 2022 },

    // ── Nissan ──
    { id: "magnite", mfgId: "nissan", name: "Magnite", yearFrom: 2020, yearTo: 2025 },
    { id: "kicks", mfgId: "nissan", name: "Kicks", yearFrom: 2019, yearTo: 2022 },
    { id: "xtrail", mfgId: "nissan", name: "X-Trail", yearFrom: 2024, yearTo: 2025 },

    // ── Ford (discontinued in India but parts still sold) ──
    { id: "ecosport", mfgId: "ford", name: "EcoSport", yearFrom: 2013, yearTo: 2022 },
    { id: "endeavour", mfgId: "ford", name: "Endeavour", yearFrom: 2008, yearTo: 2022 },
    { id: "figo", mfgId: "ford", name: "Figo", yearFrom: 2010, yearTo: 2021 },
    { id: "aspire", mfgId: "ford", name: "Aspire", yearFrom: 2015, yearTo: 2021 },

    // ── Chevrolet (discontinued in India but parts still sold) ──
    { id: "beat", mfgId: "chevrolet", name: "Beat", yearFrom: 2010, yearTo: 2019 },
    { id: "cruze", mfgId: "chevrolet", name: "Cruze", yearFrom: 2009, yearTo: 2017 },
    { id: "enjoy", mfgId: "chevrolet", name: "Enjoy", yearFrom: 2013, yearTo: 2017 },
    { id: "tavera", mfgId: "chevrolet", name: "Tavera", yearFrom: 2004, yearTo: 2017 },

    // ── BMW ──
    { id: "3series", mfgId: "bmw", name: "3 Series", yearFrom: 2010, yearTo: 2025 },
    { id: "5series", mfgId: "bmw", name: "5 Series", yearFrom: 2010, yearTo: 2025 },
    { id: "x1", mfgId: "bmw", name: "X1", yearFrom: 2013, yearTo: 2025 },
    { id: "x3", mfgId: "bmw", name: "X3", yearFrom: 2011, yearTo: 2025 },
    { id: "x5", mfgId: "bmw", name: "X5", yearFrom: 2010, yearTo: 2025 },
    { id: "2series", mfgId: "bmw", name: "2 Series GC", yearFrom: 2020, yearTo: 2025 },

    // ── Mercedes-Benz ──
    { id: "aclass", mfgId: "mercedes", name: "A-Class", yearFrom: 2015, yearTo: 2025 },
    { id: "cclass", mfgId: "mercedes", name: "C-Class", yearFrom: 2010, yearTo: 2025 },
    { id: "eclass", mfgId: "mercedes", name: "E-Class", yearFrom: 2010, yearTo: 2025 },
    { id: "gle", mfgId: "mercedes", name: "GLE", yearFrom: 2015, yearTo: 2025 },
    { id: "glc", mfgId: "mercedes", name: "GLC", yearFrom: 2016, yearTo: 2025 },
    { id: "gla", mfgId: "mercedes", name: "GLA", yearFrom: 2014, yearTo: 2025 },
    { id: "glb", mfgId: "mercedes", name: "GLB", yearFrom: 2022, yearTo: 2025 },

    // ── Audi ──
    { id: "a4", mfgId: "audi", name: "A4", yearFrom: 2008, yearTo: 2025 },
    { id: "a6", mfgId: "audi", name: "A6", yearFrom: 2008, yearTo: 2025 },
    { id: "q3", mfgId: "audi", name: "Q3", yearFrom: 2012, yearTo: 2025 },
    { id: "q5", mfgId: "audi", name: "Q5", yearFrom: 2013, yearTo: 2025 },
    { id: "q7", mfgId: "audi", name: "Q7", yearFrom: 2007, yearTo: 2025 },
    { id: "a3", mfgId: "audi", name: "A3", yearFrom: 2014, yearTo: 2025 },

    // ── Jeep ──
    { id: "compass", mfgId: "jeep", name: "Compass", yearFrom: 2017, yearTo: 2025 },
    { id: "meridian", mfgId: "jeep", name: "Meridian", yearFrom: 2022, yearTo: 2025 },
    { id: "wrangler", mfgId: "jeep", name: "Wrangler", yearFrom: 2016, yearTo: 2025 },
    { id: "grand_cherokee", mfgId: "jeep", name: "Grand Cherokee", yearFrom: 2022, yearTo: 2025 },

    // ── Volvo ──
    { id: "xc40", mfgId: "volvo", name: "XC40", yearFrom: 2018, yearTo: 2025 },
    { id: "xc60", mfgId: "volvo", name: "XC60", yearFrom: 2013, yearTo: 2025 },
    { id: "xc90", mfgId: "volvo", name: "XC90", yearFrom: 2007, yearTo: 2025 },
    { id: "s60", mfgId: "volvo", name: "S60", yearFrom: 2015, yearTo: 2025 },
    { id: "s90", mfgId: "volvo", name: "S90", yearFrom: 2016, yearTo: 2025 },

    // ── Isuzu ──
    { id: "dmax", mfgId: "isuzu", name: "D-Max V-Cross", yearFrom: 2016, yearTo: 2025 },
    { id: "mu_x", mfgId: "isuzu", name: "mu-X", yearFrom: 2017, yearTo: 2025 },
    { id: "dmax_rt", mfgId: "isuzu", name: "D-Max Regular", yearFrom: 2014, yearTo: 2025 },
];

// ─── UTILITY: Get years for a model ───
export function getYearsForModel(modelId) {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return [];
    const years = [];
    for (let y = model.yearTo; y >= model.yearFrom; y--) {
        years.push(y);
    }
    return years;
}

// ─── UTILITY: Get models for a manufacturer ───
export function getModelsForMfg(mfgId) {
    return MODELS.filter(m => m.mfgId === mfgId).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── UTILITY: Build a match string from selection ───
export function buildVehicleMatchStr(mfgId, modelId) {
    const mfg = MANUFACTURERS.find(m => m.id === mfgId);
    const model = MODELS.find(m => m.id === modelId);
    if (!mfg || !model) return null;
    return `${mfg.name} ${model.name}`;
}

// ─── UTILITY: Check if product is compatible with vehicle ───
export function isProductCompatible(product, matchStr) {
    if (!product.compatibleVehicles || product.compatibleVehicles.length === 0) return false;
    // Universal products are always compatible
    if (product.compatibleVehicles.some(v => v.toLowerCase() === "universal")) return "universal";
    // Check for exact or partial match
    if (product.compatibleVehicles.some(v => v.toLowerCase().includes(matchStr.toLowerCase()))) return "compatible";
    return false;
}

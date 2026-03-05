// Simulated relational Database for 1M+ SKU scale architecture

export const VEHICLES = [
    { id: "v1", type: "Car", brand: "Maruti Suzuki", model: "Swift", year: "2022", variant: "ZXi" },
    { id: "v2", type: "Car", brand: "Maruti Suzuki", model: "Baleno", year: "2023", variant: "Alpha" },
    { id: "v3", type: "Car", brand: "Tata", model: "Nexon", year: "2023", variant: "XZA+" },
    { id: "v4", type: "Car", brand: "Tata", model: "Punch", year: "2022", variant: "Accomplished" },
    { id: "v5", type: "Car", brand: "Mahindra", model: "XUV 3XO", year: "2024", variant: "AX5" },
    { id: "v6", type: "Car", brand: "Kia", model: "Sonet", year: "2023", variant: "GTX+" },
    { id: "v7", type: "Car", brand: "Hyundai", model: "Creta", year: "2023", variant: "SX" },
    { id: "v8", type: "Car", brand: "Hyundai", model: "Venue", year: "2022", variant: "SX(O)" },
    { id: "v9", type: "Car", brand: "Renault", model: "Kwid", year: "2021", variant: "RXT" },
    { id: "v10", type: "Car", brand: "Hyundai", model: "Elite i20", year: "2020", variant: "Asta" },
    { id: "v11", type: "Bike", brand: "Honda", model: "Activa 6G", year: "2022", variant: "Standard" },
];

export const CATEGORIES = [
    "Brakes", "Engine", "Filters", "Suspension", "Electrical", "Accessories", "Body Parts", "Fluids"
];

// Master Catalog of products (Global level)
export const MASTER_PRODUCTS = [
    {
        id: "mp1",
        name: "Bosch Front Brake Pads",
        brand: "Bosch",
        category: "Brakes",
        sku: "BSH-BRK-001",
        compatibility: ["v1", "v2"], // Swift & Baleno
        description: "Premium OEM equivalent ceramic brake pads for high-volume Maruti Suzuki hatchbacks. Zero dust formula.",
        specifications: { weight: "1.1kg", material: "Ceramic", warranty: "1 Year" },
        image: "https://images.unsplash.com/photo-1600705357388-75211dcdb66f?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 3200,
        created_at: "2023-01-10T00:00:00Z"
    },
    {
        id: "mp2",
        name: "Mahle Premium Oil Filter",
        brand: "Mahle",
        category: "Filters",
        sku: "MHL-OIL-CR",
        compatibility: ["v7", "v8"], // Creta & Venue
        description: "High-efficiency spin-on oil filter engineered for Hyundai CRDi and VTVT engines.",
        specifications: { weight: "250g", type: "Spin-on", warranty: "10,000 km" },
        image: "https://images.unsplash.com/photo-1549488344-c7ef21a416a2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 2800,
        created_at: "2023-02-15T00:00:00Z"
    },
    {
        id: "mp3",
        name: "NGK Laser Iridium Spark Plug",
        brand: "NGK",
        category: "Electrical",
        sku: "NGK-IR-UNI",
        compatibility: ["v9", "v11"], // Kwid & Activa
        description: "Universal iridium technology for ubiquitous two-wheelers and high-efficiency compact engines.",
        specifications: { weight: "100g", material: "Iridium", type: "Universal 2W/Compact" },
        image: "https://images.unsplash.com/photo-1616428781489-082260f723ea?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 4500,
        created_at: "2023-11-20T00:00:00Z"
    },
    {
        id: "mp4",
        name: "Monroe OESpectrum Strut Assembly",
        brand: "Monroe",
        category: "Suspension",
        sku: "MNR-STR-NX",
        compatibility: ["v3"], // Nexon
        description: "Heavy-duty MacPherson strut designed to handle diverse road conditions for compact SUVs.",
        specifications: { weight: "4.5kg", position: "Front", warranty: "2 Years" },
        image: "https://images.unsplash.com/photo-1611082590217-06df31b997c2?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 850,
        created_at: "2023-05-12T00:00:00Z"
    },
    {
        id: "mp5",
        name: "Purolator Active Carbon Air Filter",
        brand: "Purolator",
        category: "Filters",
        sku: "PUR-CAB-UNI",
        compatibility: ["v1", "v2", "v3", "v6", "v7"], // Fits a lot of cars
        description: "Multi-layered activated carbon cabin filter targeting urban particulate matter.",
        specifications: { weight: "200g", type: "Activated Carbon" },
        image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=200&h=200",
        global_sales_velocity: 1900,
        created_at: "2023-08-01T00:00:00Z"
    }
];

// Shops participating in marketplace (Hyperlocal Hyderabad Context)
export const SHOPS = [
    { id: "s1", name: "Sri Durga Motors (Mehdipatnam)", lat: 17.3916, lng: 78.4398, rating: 4.8, reviews: 340, is_featured: true, delivery_radius: 15 },
    { id: "s2", name: "Auto Nagar Distributors", lat: 17.3753, lng: 78.5577, rating: 4.5, reviews: 120, is_featured: false, delivery_radius: 20 },
    { id: "s3", name: "Madhapur Spares Hub", lat: 17.4483, lng: 78.3915, rating: 4.2, reviews: 85, is_featured: false, delivery_radius: 10 }
];

// Individual Shop Inventory Listings (Link MP to Shop)
export const SHOP_INVENTORY = [
    { shop_id: "s1", product_id: "mp1", selling_price: 1850, buying_price: 1400, discount: 10, stock_quantity: 42, min_stock: 5, delivery_time: "Same Day", total_sales: 840 },
    { shop_id: "s2", product_id: "mp1", selling_price: 1950, buying_price: 1450, discount: 0, stock_quantity: 114, min_stock: 15, delivery_time: "Next Day", total_sales: 445 },
    { shop_id: "s3", product_id: "mp1", selling_price: 1900, buying_price: 1420, discount: 5, stock_quantity: 12, min_stock: 5, delivery_time: "Same Day", total_sales: 120 },

    { shop_id: "s1", product_id: "mp2", selling_price: 450, buying_price: 300, discount: 5, stock_quantity: 30, min_stock: 10, delivery_time: "Same Day", total_sales: 400 },
    { shop_id: "s3", product_id: "mp2", selling_price: 420, buying_price: 280, discount: 12, stock_quantity: 5, min_stock: 10, delivery_time: "Same Day", total_sales: 460 },

    { shop_id: "s2", product_id: "mp3", selling_price: 250, buying_price: 180, discount: 15, stock_quantity: 150, min_stock: 20, delivery_time: "Same Day", total_sales: 1800 },
    { shop_id: "s3", product_id: "mp3", selling_price: 280, buying_price: 190, discount: 0, stock_quantity: 25, min_stock: 10, delivery_time: "Next Day", total_sales: 300 },

    { shop_id: "s1", product_id: "mp4", selling_price: 3500, buying_price: 2800, discount: 5, stock_quantity: 8, min_stock: 4, delivery_time: "Same Day", total_sales: 40 },

    { shop_id: "s1", product_id: "mp5", selling_price: 550, buying_price: 380, discount: 0, stock_quantity: 45, min_stock: 15, delivery_time: "Same Day", total_sales: 230 },
    { shop_id: "s2", product_id: "mp5", selling_price: 500, buying_price: 360, discount: 10, stock_quantity: 115, min_stock: 10, delivery_time: "Next Day", total_sales: 1110 },
    { shop_id: "s3", product_id: "mp5", selling_price: 580, buying_price: 390, discount: 0, stock_quantity: 16, min_stock: 10, delivery_time: "Same Day", total_sales: 85 }
];

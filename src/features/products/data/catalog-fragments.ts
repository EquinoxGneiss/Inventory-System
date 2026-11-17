import type { ProductType, UnitOfMeasure } from "../types";

/**
 * Generic, unbranded catalog fragments used to generate per-organization demo
 * catalogs. Each entry is [base name, variants, unit code, type?].
 */
export const UNITS: Record<string, UnitOfMeasure> = {
  pc: { code: "pc", name: "Piece", precision: 0 },
  box: { code: "box", name: "Box", precision: 0 },
  ream: { code: "ream", name: "Ream", precision: 0 },
  roll: { code: "roll", name: "Roll", precision: 0 },
  pack: { code: "pack", name: "Pack", precision: 0 },
  pair: { code: "pair", name: "Pair", precision: 0 },
  set: { code: "set", name: "Set", precision: 0 },
  bottle: { code: "bottle", name: "Bottle", precision: 0 },
  L: { code: "L", name: "Liter", precision: 2 },
  kg: { code: "kg", name: "Kilogram", precision: 3 },
  m: { code: "m", name: "Meter", precision: 2 },
};

type CatalogEntry = readonly [
  base: string,
  variants: readonly string[],
  uom: keyof typeof UNITS,
  type?: ProductType,
];

export interface CatalogFragment {
  key: string;
  categoryName: string;
  skuPrefix: string;
  entries: readonly CatalogEntry[];
}

export const OFFICE: CatalogFragment = {
  key: "office",
  categoryName: "Office Supplies",
  skuPrefix: "OFC",
  entries: [
    ["Bond Paper", ["A4 70gsm", "A4 80gsm", "Letter 80gsm", "Legal 80gsm"], "ream"],
    ["Ballpoint Pen", ["Black", "Blue", "Red"], "box"],
    ["Whiteboard Marker", ["Black", "Blue", "Red"], "box"],
    ["Permanent Marker", ["Black", "Blue"], "box"],
    ["Highlighter", ["Yellow", "Green", "Pink"], "pc"],
    ["Sticky Notes", ["3x3 Yellow", "3x3 Assorted", "2x3 Yellow"], "pack"],
    ["Folder", ["Long Manila", "Short Manila", "Long Plastic"], "pack"],
    ["Expanding Envelope", ["Long", "Short"], "pc"],
    ["Stapler", ["Standard", "Heavy Duty"], "pc"],
    ["Staple Wire", ["No. 35", "No. 10"], "box"],
    ["Paper Clip", ["Standard", "Jumbo"], "box"],
    ["Correction Tape", ["5 mm"], "pc"],
    ["Logbook", ["200 pages", "300 pages"], "pc"],
    ["Toner Cartridge", ["Type 85", "Type 26", "Type 2380", "Type 337"], "pc"],
    ["Ink Bottle", ["Black", "Cyan", "Magenta", "Yellow"], "bottle"],
    ["Packing Tape", ["2 in Clear", "2 in Brown"], "roll"],
  ],
};

export const JANITORIAL: CatalogFragment = {
  key: "janitorial",
  categoryName: "Janitorial & Housekeeping",
  skuPrefix: "JAN",
  entries: [
    ["Hand Soap Refill", ["Antibacterial", "Moisturizing"], "L", "consumable"],
    ["Floor Cleaner", ["Pine", "Lemon", "Neutral"], "L", "consumable"],
    ["Disinfectant Spray", ["Original", "Lavender"], "bottle", "consumable"],
    ["Bleach", ["Regular"], "L", "consumable"],
    ["Toilet Bowl Cleaner", ["Standard"], "bottle", "consumable"],
    ["Glass Cleaner", ["Standard"], "bottle", "consumable"],
    [
      "Trash Bag",
      [
        "Small Black",
        "Medium Black",
        "Large Black",
        "XL Black",
        "Large Clear",
        "Yellow Infectious",
      ],
      "pack",
    ],
    ["Tissue Roll", ["2-ply", "3-ply"], "roll"],
    ["Paper Towel", ["Interfold", "Roll"], "pack"],
    ["Mop Head", ["Cotton", "Microfiber"], "pc"],
    ["Mop Handle", ["Standard"], "pc"],
    ["Broom", ["Soft", "Stick"], "pc"],
    ["Dustpan", ["Standard", "Long Handle"], "pc"],
    ["Microfiber Cloth", ["Blue", "Yellow", "Green", "Red"], "pack"],
    ["Rubber Gloves", ["Medium", "Large"], "pair"],
    ["Air Freshener", ["Citrus", "Floral"], "bottle", "consumable"],
    ["Detergent Powder", ["Standard"], "kg", "consumable"],
  ],
};

export const PPE: CatalogFragment = {
  key: "ppe",
  categoryName: "Safety & PPE",
  skuPrefix: "PPE",
  entries: [
    ["Face Mask", ["3-ply Surgical", "KN95"], "box"],
    ["Nitrile Gloves", ["Small", "Medium", "Large", "XL"], "box"],
    ["Safety Goggles", ["Clear", "Anti-fog"], "pc"],
    ["Hard Hat", ["White", "Yellow", "Blue"], "pc"],
    ["Reflective Vest", ["M", "L", "XL"], "pc"],
    ["Safety Shoes", ["Size 40", "Size 41", "Size 42", "Size 43", "Size 44"], "pair"],
    ["Ear Plugs", ["Disposable"], "box"],
    ["Face Shield", ["Standard"], "pc"],
    ["Isolation Gown", ["Medium", "Large"], "pack"],
    ["Hand Sanitizer", ["500 mL", "1 L"], "bottle", "consumable"],
    ["Isopropyl Alcohol 70%", ["500 mL", "1 gal"], "bottle", "consumable"],
  ],
};

export const ELECTRICAL: CatalogFragment = {
  key: "electrical",
  categoryName: "Electrical",
  skuPrefix: "ELC",
  entries: [
    ["LED Bulb", ["9 W Daylight", "12 W Daylight", "9 W Warm White"], "pc"],
    ["LED Tube", ["T8 18 W", "T8 9 W"], "pc"],
    ["Extension Cord", ["3 m 4-gang", "5 m 4-gang"], "pc"],
    ["Electrical Tape", ["Black", "Red", "Blue"], "roll"],
    ["THHN Wire 3.5 mm²", ["Black", "White", "Green"], "m"],
    ["Circuit Breaker", ["20 A", "30 A", "60 A"], "pc"],
    ["Convenience Outlet", ["Duplex", "Universal"], "pc"],
    ["Wall Switch", ["1-gang", "2-gang", "3-gang"], "pc"],
    ["AA Battery", ["Alkaline"], "pack"],
    ["AAA Battery", ["Alkaline"], "pack"],
    ["Cable Tie", ["6 in", "8 in", "12 in"], "pack"],
  ],
};

export const PLUMBING: CatalogFragment = {
  key: "plumbing",
  categoryName: "Plumbing",
  skuPrefix: "PLB",
  entries: [
    ["PVC Pipe 1/2 in", ["3 m"], "pc"],
    ["PVC Pipe 3/4 in", ["3 m"], "pc"],
    ["PVC Elbow", ["1/2 in", "3/4 in"], "pc"],
    ["PVC Tee", ["1/2 in", "3/4 in"], "pc"],
    ["Thread Seal Tape", ["Standard"], "roll"],
    ["Faucet", ["Lavatory", "Kitchen"], "pc"],
    ["Angle Valve", ["1/2 in"], "pc"],
    ["Flexible Hose", ["12 in", "16 in"], "pc"],
    ["PVC Solvent Cement", ["100 mL", "400 mL"], "bottle"],
    ["Toilet Flush Valve", ["Standard"], "set"],
    ["Drain Cleaner", ["Granules"], "kg", "consumable"],
    ["Shower Head", ["Standard"], "pc"],
  ],
};

export const IT_PERIPHERALS: CatalogFragment = {
  key: "it",
  categoryName: "IT Peripherals",
  skuPrefix: "ITP",
  entries: [
    ["Mouse", ["USB Wired", "Wireless"], "pc"],
    ["Keyboard", ["USB Wired", "Wireless"], "pc"],
    ["HDMI Cable", ["1.5 m", "3 m", "5 m"], "pc"],
    ["Patch Cable Cat6", ["1 m", "3 m", "5 m"], "pc"],
    ["RJ45 Connector", ["Cat6"], "pack"],
    ["USB Flash Drive", ["32 GB", "64 GB"], "pc"],
    ["USB-C Charger", ["65 W"], "pc"],
    ["Monitor", ["22 in", "24 in"], "pc"],
    ["Headset", ["USB"], "pc"],
    ["Webcam", ["1080p"], "pc"],
    ["Surge Protector", ["6-outlet"], "pc"],
    ["UPS", ["650 VA", "1000 VA"], "pc"],
  ],
};

export const PANTRY: CatalogFragment = {
  key: "pantry",
  categoryName: "Pantry",
  skuPrefix: "PNT",
  entries: [
    ["Drinking Water", ["5 gal Refill", "500 mL Case"], "pc", "consumable"],
    ["Coffee", ["Ground 500 g", "3-in-1 Sachets"], "pack", "consumable"],
    ["Sugar", ["White 1 kg", "Brown 1 kg"], "pack", "consumable"],
    ["Creamer", ["Powder 450 g"], "pack", "consumable"],
    ["Paper Cup", ["6.5 oz", "8 oz Hot"], "pack", "consumable"],
    ["Stirrer", ["Wooden"], "pack", "consumable"],
    ["Dishwashing Liquid", ["Lemon"], "L", "consumable"],
    ["Scrub Sponge", ["Standard"], "pc", "consumable"],
    ["Tea Bags", ["Green", "Black"], "box", "consumable"],
  ],
};

export const MEDICAL: CatalogFragment = {
  key: "medical",
  categoryName: "Medical Consumables",
  skuPrefix: "MED",
  entries: [
    ["Syringe", ["1 mL", "3 mL", "5 mL", "10 mL"], "box"],
    ["Hypodermic Needle", ["23G", "25G"], "box"],
    ["IV Cannula", ["18G", "20G", "22G", "24G"], "box"],
    ["IV Administration Set", ["Macro", "Micro"], "pc"],
    ["Gauze Pad", ["2x2", "4x4"], "pack"],
    ["Cotton Balls", ["100s"], "pack"],
    ["Adhesive Bandage", ["Assorted"], "box"],
    ["Micropore Tape", ["1 in", "2 in"], "roll"],
    ["Elastic Bandage", ["2 in", "4 in", "6 in"], "roll"],
    ["Urine Collection Bag", ["2000 mL"], "pc"],
    ["Foley Catheter", ["Fr 14", "Fr 16", "Fr 18"], "pc"],
    ["Suction Catheter", ["Fr 10", "Fr 12"], "pc"],
    ["Nasal Cannula", ["Adult", "Pediatric"], "pc"],
    ["Specimen Cup", ["60 mL"], "pack"],
    ["Tongue Depressor", ["Wooden"], "box"],
    ["Povidone-Iodine Solution", ["120 mL", "1 L"], "bottle"],
    ["Sterile Water", ["1 L"], "bottle"],
    ["Examination Gown", ["Disposable"], "pack"],
  ],
};

export const LABORATORY: CatalogFragment = {
  key: "lab",
  categoryName: "Laboratory",
  skuPrefix: "LAB",
  entries: [
    [
      "Blood Collection Tube",
      ["EDTA Lavender", "Serum Red", "Citrate Blue", "Heparin Green"],
      "box",
    ],
    ["Microscope Slide", ["Plain", "Frosted"], "box"],
    ["Cover Slip", ["22x22 mm"], "box"],
    ["Pipette Tip", ["10 µL", "200 µL", "1000 µL"], "pack"],
    ["Petri Dish", ["90 mm"], "pack"],
    ["Test Tube", ["12x75 mm", "16x100 mm"], "pack"],
    ["Safety Lancet", ["Standard"], "box"],
    ["Alcohol Swab", ["Individual"], "box"],
    ["Glucose Test Strip", ["50s"], "box"],
    ["Urine Test Strip", ["10-parameter"], "box"],
    ["Hematology Diluent", ["20 L"], "L", "consumable"],
    ["Sharps Container", ["1 L", "5 L"], "pc"],
  ],
};

export const LINEN: CatalogFragment = {
  key: "linen",
  categoryName: "Linen",
  skuPrefix: "LIN",
  entries: [
    ["Bed Sheet", ["Single", "Semi-double"], "pc"],
    ["Pillow Case", ["Standard"], "pc"],
    ["Blanket", ["Fleece"], "pc"],
    ["Patient Gown", ["Adult M", "Adult L", "Pediatric"], "pc"],
    ["Bath Towel", ["White"], "pc"],
    ["Scrub Suit", ["S", "M", "L", "XL"], "set"],
    ["Draw Sheet", ["Standard"], "pc"],
    ["Laundry Bag", ["Linen", "Soiled"], "pc"],
  ],
};

export const ORGANIZATION_CATALOGS: Record<string, readonly CatalogFragment[]> = {
  "org-nbh": [OFFICE, JANITORIAL, PPE, ELECTRICAL, PLUMBING, IT_PERIPHERALS, PANTRY],
  "org-lmg": [MEDICAL, LABORATORY, PPE, LINEN, JANITORIAL, OFFICE, PANTRY],
};

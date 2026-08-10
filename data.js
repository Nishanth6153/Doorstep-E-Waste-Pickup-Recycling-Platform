// JSON REPRESENTATION: E-waste item catalogue — used for DOM rendering, filtering, and sorting.
// Each object represents one category of e-waste with hazard metadata.
const ewasteItems = [
  {
    id: 1,
    category: 'Mobile Devices',
    itemName: 'Smartphone',
    description: 'Lithium-ion battery, rare-earth metals, and recoverable gold contacts make this high-priority for collection.',
    hazardLevel: 'Medium',
    iconOrImage: '📱',
    recoveredMaterials: ['Lithium', 'Gold', 'Cobalt']
  },
  {
    id: 2,
    category: 'Computers',
    itemName: 'Laptop',
    description: 'Circuit boards contain cadmium and lead. Must be data-wiped before recycling. High material recovery value.',
    hazardLevel: 'Medium',
    iconOrImage: '💻',
    recoveredMaterials: ['Copper', 'Aluminium', 'Gold', 'Cadmium']
  },
  {
    id: 3,
    category: 'Power',
    itemName: 'Rechargeable Battery',
    description: 'Fire and chemical hazard if punctured or crushed. Requires specialist handling and dedicated battery stream.',
    hazardLevel: 'High',
    iconOrImage: '🔋',
    recoveredMaterials: ['Lithium', 'Nickel', 'Cobalt']
  },
  {
    id: 4,
    category: 'Accessories',
    itemName: 'Charging Cable & Adapter',
    description: 'Recoverable copper wiring and recyclable plastic casing. Never enter household waste or incineration.',
    hazardLevel: 'Low',
    iconOrImage: '🔌',
    recoveredMaterials: ['Copper', 'PVC Plastic']
  },
  {
    id: 5,
    category: 'Computers',
    itemName: 'Desktop Monitor',
    description: 'Older CRT screens contain leaded glass. Modern LCDs contain mercury backlights requiring special handling.',
    hazardLevel: 'High',
    iconOrImage: '🖥️',
    recoveredMaterials: ['Glass', 'Copper', 'Plastics', 'Mercury']
  },
  {
    id: 6,
    category: 'Home Electronics',
    itemName: 'Wireless Router',
    description: 'Small circuit boards with solder and trace metals. Should not enter landfill — easily collected in bulk.',
    hazardLevel: 'Low',
    iconOrImage: '📡',
    recoveredMaterials: ['Copper', 'Tin', 'Plastic']
  },
  {
    id: 7,
    category: 'Mobile Devices',
    itemName: 'Tablet',
    description: 'Similar to smartphones but larger lithium pack. Screen contains indium tin oxide — a valuable rare material.',
    hazardLevel: 'Medium',
    iconOrImage: '📟',
    recoveredMaterials: ['Lithium', 'Indium', 'Gold']
  },
  {
    id: 8,
    category: 'Home Electronics',
    itemName: 'Smart Speaker',
    description: 'Compact device with embedded battery and multiple circuit boards. Internal battery must be safely removed first.',
    hazardLevel: 'Medium',
    iconOrImage: '🔈',
    recoveredMaterials: ['Copper', 'Lithium', 'Plastic']
  }
];

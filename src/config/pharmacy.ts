export const PHARMACY_CONFIG = {
  name: 'SUSSEX PHARMCY Freetown Sierra Leone',
  shortName: 'SUSSEX PHARMCY',
  tagline: 'Freetown\'s Trusted Clinical Pharmacy & Healthcare Management Partner',
  address: '29 Wilberforce Street, Freetown',
  city: 'Freetown',
  district: 'Western Area Urban',
  country: 'Sierra Leone',
  phoneNumbers: ['078386123', '033327227'],
  phoneDisplay: '078386123 / 033327227',
  primaryPhone: '078386123',
  secondaryPhone: '033327227',
  emergencyPhone: '078386123',
  whatsappNumber: '23278386123',
  whatsappDisplay: '+232 78 386123',
  email: 'info@sussexpharmcy.sl',
  openingHours: {
    weekdays: '7:30 AM - 10:00 PM',
    saturday: '8:00 AM - 10:00 PM',
    sunday: '9:00 AM - 8:00 PM',
    emergency: '24/7 Emergency On-Call Dispensary'
  },
  services: [
    {
      id: 'dispensing',
      title: 'Prescription Dispensing',
      description: 'Accurate dispensing of doctor prescriptions with comprehensive dosage guidance and patient counseling.',
      icon: 'Pill'
    },
    {
      id: 'chronic-care',
      title: 'Chronic Disease Management',
      description: 'Tailored medication plans, monitoring, and regular refills for Hypertension, Diabetes, and Asthma.',
      icon: 'HeartPulse'
    },
    {
      id: 'tropical-care',
      title: 'Malaria & Infection Care',
      description: 'Rapid diagnostic screening, WHO-standard ACT antimalarials, and certified antibiotics for bacterial infections.',
      icon: 'ShieldCheck'
    },
    {
      id: 'maternal-child',
      title: 'Maternal & Child Health',
      description: 'Prenatal vitamins, pediatric formulations, oral rehydration therapy, and child wellness nutrition.',
      icon: 'Baby'
    },
    {
      id: 'diagnostics',
      title: 'Clinical Health Screenings',
      description: 'Walk-in blood pressure monitoring, blood sugar checks, BMI calculation, and pulse oximetry at 29 Wilberforce Street.',
      icon: 'Stethoscope'
    },
    {
      id: 'wholesale-supply',
      title: 'Hospital & Clinic Wholesale Trading',
      description: 'Bulk pharmaceuticals, surgical disposables, IV fluids, and medical supplies for clinics and hospitals across Freetown.',
      icon: 'Truck'
    }
  ],
  sampleMedications: [
    {
      id: 'artemether-lumefantrine',
      name: 'Coartem (Artemether / Lumefantrine)',
      genericName: 'Artemether 20mg / Lumefantrine 120mg',
      category: 'Antimalarials',
      price: 45,
      stockLevel: 120,
      unit: 'tablets' as const,
      description: 'First-line ACT antimalarial treatment for uncomplicated Plasmodium falciparum malaria in adults and children.',
      manufacturer: 'Novartis',
      requiresPrescription: false
    },
    {
      id: 'amoxicillin-clavulanate',
      name: 'Augmentin (Amoxicillin / Clavulanate)',
      genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
      category: 'Antibiotics',
      price: 85,
      stockLevel: 65,
      unit: 'tablets' as const,
      description: 'Broad-spectrum antibiotic for respiratory tract infections, skin infections, and dental abscesses.',
      manufacturer: 'GSK',
      requiresPrescription: true
    },
    {
      id: 'paracetamol-500',
      name: 'Paracetamol 500mg BP',
      genericName: 'Acetaminophen 500mg',
      category: 'Analgesics',
      price: 15,
      stockLevel: 300,
      unit: 'tablets' as const,
      description: 'Fast-acting relief for mild to moderate pain, headache, and fever reduction.',
      manufacturer: 'Emzor Pharmaceuticals',
      requiresPrescription: false
    },
    {
      id: 'metformin-500',
      name: 'Metformin HCl 500mg',
      genericName: 'Metformin Hydrochloride',
      category: 'Cardiovascular',
      price: 40,
      stockLevel: 95,
      unit: 'tablets' as const,
      description: 'Essential oral antidiabetic medication for managing Type 2 Diabetes Mellitus.',
      manufacturer: 'Merck',
      requiresPrescription: true
    },
    {
      id: 'amlodipine-5mg',
      name: 'Amlodipine Besylate 5mg',
      genericName: 'Amlodipine 5mg',
      category: 'Cardiovascular',
      price: 35,
      stockLevel: 80,
      unit: 'tablets' as const,
      description: 'Calcium channel blocker for hypertension and coronary artery disease management.',
      manufacturer: 'Pfizer',
      requiresPrescription: true
    },
    {
      id: 'multivitamin-syrup',
      name: 'Pediatric Multi-Vitamin Syrup',
      genericName: 'Vitamins A, C, D, B-Complex + Zinc',
      category: 'Vitamins',
      price: 55,
      stockLevel: 45,
      unit: 'bottles' as const,
      description: 'High-potency growth and immune support syrup for growing children and infants.',
      manufacturer: 'Vitabiotics',
      requiresPrescription: false
    },
    {
      id: 'ors-zinc',
      name: 'Oral Rehydration Salts (ORS) + Zinc',
      genericName: 'WHO Standard ORS + 20mg Zinc',
      category: 'Gastrointestinal',
      price: 20,
      stockLevel: 150,
      unit: 'tablets' as const,
      description: 'WHO-recommended treatment for diarrhea and dehydration prevention in infants and adults.',
      manufacturer: 'FDC Limited',
      requiresPrescription: false
    },
    {
      id: 'ciprofloxacin-500',
      name: 'Ciprofloxacin 500mg',
      genericName: 'Ciprofloxacin Hydrochloride',
      category: 'Antibiotics',
      price: 50,
      stockLevel: 70,
      unit: 'tablets' as const,
      description: 'Potent fluoroquinolone antibiotic for urinary tract and bacterial gastrointestinal infections.',
      manufacturer: 'Bayer',
      requiresPrescription: true
    },
    {
      id: 'ventolin-inhaler',
      name: 'Ventolin Evohaler 100mcg',
      genericName: 'Salbutamol Sulfate',
      category: 'Respiratory',
      price: 95,
      stockLevel: 30,
      unit: 'bottles' as const,
      description: 'Fast-acting bronchodilator for rapid relief of asthma bronchospasm and wheezing.',
      manufacturer: 'GSK',
      requiresPrescription: true
    },
    {
      id: 'omeprazole-20',
      name: 'Omeprazole 20mg Capsules',
      genericName: 'Omeprazole Delayed-Release',
      category: 'Gastrointestinal',
      price: 30,
      stockLevel: 110,
      unit: 'capsules' as const,
      description: 'Proton pump inhibitor for treating peptic ulcers, acid reflux, and heartburn.',
      manufacturer: 'AstraZeneca',
      requiresPrescription: false
    }
  ]
};


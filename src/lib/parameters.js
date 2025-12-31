export const predefinedParams = {
  hematology: {
    name: 'Contador hematologico',
    params: {
      'WBC': { mean: 0, sd: 0, unit: '10³/uL' },
      'RBC': { mean: 0, sd: 0, unit: '10⁶/uL' },
      'HGB': { mean: 0, sd: 0, unit: 'g/dL' },
      'HCT': { mean: 0, sd: 0, unit: '%' },
      'MCV': { mean: 0, sd: 0, unit: 'fL' },
      'MCH': { mean: 0, sd: 0, unit: 'pg' },
      'MCHC': { mean: 0, sd: 0, unit: 'g/dL' },
      'PLT': { mean: 0, sd: 0, unit: '10³/uL' },
      'NEU%': { mean: 0, sd: 0, unit: '%' },
      'LYM%': { mean: 0, sd: 0, unit: '%' },
      'MONO%': { mean: 0, sd: 0, unit: '%' },
      'EOS%': { mean: 0, sd: 0, unit: '%' },
      'BASO%': { mean: 0, sd: 0, unit: '%' },
    }
  },
  chemistry: {
    name: 'Quimica Clinica',
    params: {
      'GLU': { mean: 0, sd: 0, unit: 'mg/dL' },
      'UREA': { mean: 0, sd: 0, unit: 'mg/dL' },
      'CREA': { mean: 0, sd: 0, unit: 'mg/dL' },
      'CHOL': { mean: 0, sd: 0, unit: 'mg/dL' },
      'TRIG': { mean: 0, sd: 0, unit: 'mg/dL' },
      'BILT': { mean: 0, sd: 0, unit: 'mg/dL' },
      'BILD': { mean: 0, sd: 0, unit: 'mg/dL' },
      'AST': { mean: 0, sd: 0, unit: 'U/L' },
      'ALT': { mean: 0, sd: 0, unit: 'U/L' },
      'GGT': { mean: 0, sd: 0, unit: 'U/L' },
      'ALP': { mean: 0, sd: 0, unit: 'U/L' },
      'PROT': { mean: 0, sd: 0, unit: 'g/dL' },
      'ALB': { mean: 0, sd: 0, unit: 'g/dL' },
    }
  },
  ionogram: {
    name: 'Ionograma',
    params: {
      'Na+': { mean: 0, sd: 0, unit: 'mEq/L' },
      'K+': { mean: 0, sd: 0, unit: 'mEq/L' },
      'Cl-': { mean: 0, sd: 0, unit: 'mEq/L' },
      'Ca++': { mean: 0, sd: 0, unit: 'mg/dL' },
      'Mg++': { mean: 0, sd: 0, unit: 'mg/dL' },
    }
  },
  gas: {
    name: 'Acido Base',
    params: {
      'pH': { mean: 0, sd: 0, unit: '' },
      'pCO2': { mean: 0, sd: 0, unit: 'mmHg' },
      'pO2': { mean: 0, sd: 0, unit: 'mmHg' },
      'HCO3-': { mean: 0, sd: 0, unit: 'mmol/L' },
      'BE': { mean: 0, sd: 0, unit: 'mmol/L' },
    }
  },
  coagulation: {
    name: 'Coagulometria',
    params: {
      'PT': { mean: 0, sd: 0, unit: 'sec' },
      'APTT': { mean: 0, sd: 0, unit: 'sec' },
      'FIB': { mean: 0, sd: 0, unit: 'mg/dL' },
      'TT': { mean: 0, sd: 0, unit: 'sec' },
    }
  }
};

export const commonUnits = ['mg/dL', 'g/dL', 'U/L', 'mmol/L', 'µmol/L', 'ng/mL', 'pg/mL', '10³/uL', '10⁶/uL', '%', 'fL', 'pg', 'mEq/L', 'mmHg', 'sec'];
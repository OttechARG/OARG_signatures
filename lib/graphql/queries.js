export const GET_COMPANIES = `
  query {
    companies {
      CPY_0
      CPYNAM_0
    }
  }
`;
export const queryFacilities = `
  query Facilities($legcpy: String) {
    facilities(legcpy: $legcpy) {
      FCY_0
      FCYSHO_0
    }
  }
`;
export const queryRemitos = `
  query Remitos($cpy: String!, $stofcy: String!, $desde: String) {
    remitos(cpy: $cpy, stofcy: $stofcy, desde: $desde) {
      CPY_0
      DLVDAT_0
      STOFCY_0
      SDHNUM_0
      BPCORD_0
      BPDNAM_0
    }
  }
`;

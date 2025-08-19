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
  query Remitos($cpy: String!, $stofcy: String!, $desde: String, $page: Int, $pageSize: Int, $firmadoFilter: String) {
    remitos(cpy: $cpy, stofcy: $stofcy, desde: $desde, page: $page, pageSize: $pageSize, firmadoFilter: $firmadoFilter) {
      remitos {
        CPY_0
        DLVDAT_0
        STOFCY_0
        SDHNUM_0
        BPCORD_0
        BPDNAM_0
        XX6FLSIGN_0
      }
      pagination {
        currentPage
        pageSize
        totalCount
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

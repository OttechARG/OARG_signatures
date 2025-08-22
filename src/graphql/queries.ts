
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
  query Remitos($cpy: String!, $stofcy: String!, $desde: String, $page: Int, $pageSize: Int, $firmadoFilter: String, $remitoFilter: String, $fechaFilter: String, $codigoFilter: String, $razonFilter: String) {
    remitos(cpy: $cpy, stofcy: $stofcy, desde: $desde, page: $page, pageSize: $pageSize, firmadoFilter: $firmadoFilter, remitoFilter: $remitoFilter, fechaFilter: $fechaFilter, codigoFilter: $codigoFilter, razonFilter: $razonFilter) {
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

export const queryRemitosDynamic = `
  query RemitosDynamic($cpy: String!, $stofcy: String!, $columns: [String!]!, $filters: [FilterInput!], $desde: String, $page: Int, $pageSize: Int) {
    remitosDynamic(cpy: $cpy, stofcy: $stofcy, columns: $columns, filters: $filters, desde: $desde, page: $page, pageSize: $pageSize) {
      remitos {
        data
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

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

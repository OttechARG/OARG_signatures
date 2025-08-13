import { queryRemitos } from "./graphql/queries.js";
import { TableHandler } from "./TableHandler.js";

export class RemitosHandler {
  async fetchRemitos(company: string, facility: string) {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryRemitos,
        variables: { cpy: company, stofcy: facility }
      })
    });
    const { data, errors } = await response.json();
    if (errors) throw new Error(JSON.stringify(errors));
    return data.remitos || [];
  }

  
}
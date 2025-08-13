import { queryRemitos } from "./graphql/queries.js";
export class RemitosHandler {
    async fetchRemitos(company, facility) {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: queryRemitos,
                variables: { cpy: company, stofcy: facility }
            })
        });
        const { data, errors } = await response.json();
        if (errors)
            throw new Error(JSON.stringify(errors));
        return data.remitos || [];
    }
}

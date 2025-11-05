const getExploreLabelFromQuery = (query: IQuery) => {
    return (
        query.explore?.new_label || query.explore?.label || query.explore?.id
    );
};

export const getExploreLabelFromFieldWithIndex = (
    query: IQuery,
    index: number
) => {
    return `${getExploreLabelFromQuery(query)} (${index + 1})`;
};
export default getExploreLabelFromQuery;

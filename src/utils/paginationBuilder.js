function buildPagination(totalCount, currentPage = 1, pageSize = 20) {
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  return { totalCount, currentPage, pageSize, totalPages };
}

module.exports = { buildPagination };

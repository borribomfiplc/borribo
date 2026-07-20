import React, { useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

// Shared pagination helper: give it the full filtered list, get back the
// current page slice plus everything needed to render a PaginationBar.
// Clamps automatically when filters shrink the list below the current page,
// so callers never need a useEffect just to reset page = 1 on filter change.

export function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    pageSize,
    pageItems,
  };
}

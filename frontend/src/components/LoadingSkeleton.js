import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <div className="px-6 py-4 flex items-center justify-between animate-pulse">
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/6"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
  </div>
);

export const FeeCardSkeleton = () => (
  <div className="py-4 flex items-center justify-between animate-pulse">
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-16"></div>
    <div className="h-8 bg-gray-200 rounded w-16"></div>
  </div>
);

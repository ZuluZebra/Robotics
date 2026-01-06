'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ChevronLeft, ChevronRight, Database } from 'lucide-react'

interface DataTableProps<T> {
  columns: Array<{
    header: string
    accessor: string | ((item: T) => string | number | React.ReactNode)
    width?: string
  }>
  data: T[]
  actions?: (item: T) => React.ReactNode
  loading?: boolean
  paginated?: boolean
  pageSize?: number
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  actions,
  loading = false,
  paginated = true,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = paginated
    ? data.slice(page * pageSize, (page + 1) * pageSize)
    : data

  const getCellValue = (
    item: T,
    accessor: string | ((item: T) => string | number | React.ReactNode)
  ) => {
    if (typeof accessor === 'function') {
      return accessor(item)
    }
    return (item as any)[accessor]
  }

  if (loading) {
    return <TableSkeleton rows={pageSize} columns={columns.length + (actions ? 1 : 0)} />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-12 w-12 text-gray-400" />}
        title="No data available"
        description="There are no records to display at this moment."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  style={{ width: col.width }}
                  className="font-semibold text-gray-900"
                >
                  {col.header}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, idx) => (
              <TableRow key={item.id} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx}>
                    {getCellValue(item, col.accessor)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell className="text-right">
                    {actions(item)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {page * pageSize + 1} to{' '}
            {Math.min((page + 1) * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

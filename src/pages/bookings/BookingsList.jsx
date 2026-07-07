import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookings, deleteBooking } from '../../api/booking.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../../components/tables/Table';
import Pagination from '../../components/tables/Pagination';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

const BookingsList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  // Delete modal state
  const [deleteId, setDeleteId] = useState(null);

  // Search input debounce handler
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    const timeout = setTimeout(() => {
      setDebouncedSearch(val);
    }, 400);
    return () => clearTimeout(timeout);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  // Query list
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', page, debouncedSearch, status],
    queryFn: () => getBookings({ page, limit: 10, search: debouncedSearch, status }),
  });

  const bookingsList = data?.data?.bookings || [];
  const pagination = data?.data?.pagination || { total: 0, pages: 1 };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      toast.success('Booking deleted successfully');
      queryClient.invalidateQueries(['bookings']);
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete operation failed');
    }
  });

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-brand-light" />
            Bookings operational Log
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Track and manage event projects lifecycle from scheduling to deliveries.
          </p>
        </div>
        <Link to="/bookings/new">
          <Button className="rounded-2xl flex items-center space-x-2">
            <Plus className="w-4.5 h-4.5" />
            <span>Launch Booking Wizard</span>
          </Button>
        </Link>
      </div>

      {/* Filters Card */}
      <Card className="p-0">
        <div className="p-6 flex flex-col md:flex-row items-center gap-4 border-b border-white/5">
          <div className="flex-1 w-full">
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search bookings by BKG number or customer name..."
              icon={Search}
              className="rounded-2xl py-2.5"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={status}
              onChange={handleStatusChange}
              options={[
                { value: '', label: 'All Lifecycle Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' }
              ]}
              className="rounded-2xl"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-12 bg-white/[0.01] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">Error loading booking logs</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : bookingsList.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">No Booking Records Found</p>
            <p className="text-sm mt-1">Start a new project by launching the Booking Wizard.</p>
          </div>
        ) : (
          <div className="p-6">
            <Table>
              <THead>
                <TR>
                  <TH>Booking No.</TH>
                  <TH>Customer Name</TH>
                  <TH>Phone</TH>
                  <TH>Timeline Range</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {bookingsList.map((bkg) => (
                  <TR key={bkg._id}>
                    <TD className="font-bold text-brand-light">{bkg.bookingNumber}</TD>
                    <TD className="font-semibold text-white">{bkg.customer?.name || 'N/A'}</TD>
                    <TD className="text-slate-400">{bkg.customer?.phone || 'N/A'}</TD>
                    <TD className="text-slate-300 text-xs">
                      {new Date(bkg.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to{' '}
                      {new Date(bkg.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TD>
                    <TD>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          bkg.status === 'Confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : bkg.status === 'Draft'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : bkg.status === 'Completed'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {bkg.status}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          onClick={() => setDeleteId(bkg._id)}
                          variant="glass"
                          size="sm"
                          className="rounded-xl p-2 hover:text-rose-400 hover:border-rose-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.pages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Delete Dialog */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Booking Record"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete this Booking Log and all its scheduled functions and workflows? This action is permanent and cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 border-t border-white/5 pt-4">
            <Button onClick={() => setDeleteId(null)} variant="glass" className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-rose-600 border-rose-600 hover:bg-rose-500 hover:border-rose-500 shadow-md shadow-rose-600/10"
              loading={deleteMutation.isLoading}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingsList;

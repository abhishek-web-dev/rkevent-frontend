import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookings, getBookingById, updateServiceWorkflow, updateServiceData } from '../../api/booking.api';
import { getStaff } from '../../api/auth.api';
import { getEquipment } from '../../api/equipment.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  Layers,
  Search,
  UserCheck,
  Camera,
  Activity,
  CheckSquare,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Plus,
  Users,
  Compass,
  Calendar,
  ChevronRight,
  CalendarDays,
  ListTodo
} from 'lucide-react';

const ProductionBoard = () => {
  const queryClient = useQueryClient();

  // Selected Booking State
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');

  // Active Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState(null);

  // New task checklist state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // 1. Fetch active bookings (for sidebar panel selector)
  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings-production', bookingSearch],
    queryFn: () => getBookings({ page: 1, limit: 50, search: bookingSearch })
  });
  const bookings = bookingsData?.data?.bookings || [];

  // Set default selected booking if none is active
  React.useEffect(() => {
    if (bookings.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookings[0]._id);
    }
  }, [bookings, selectedBookingId]);

  // 2. Fetch selected Booking details (Timelines, Services, Populates)
  const { data: bookingDetailData, isLoading: isDetailLoading, error: detailError } = useQuery({
    queryKey: ['booking-detail', selectedBookingId],
    queryFn: () => getBookingById(selectedBookingId),
    enabled: !!selectedBookingId
  });
  const activeBooking = bookingDetailData?.data?.booking || null;
  const bookingFunctions = bookingDetailData?.data?.functions || [];
  const bookingServices = bookingDetailData?.data?.services || [];

  // 3. Fetch Master Lists (Staff & Equipment) for allocation
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaff()
  });
  const staffMembers = staffData?.data || [];

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment-list'],
    queryFn: () => getEquipment()
  });
  const equipmentInventory = equipmentData?.data || [];

  // 4. Mutations
  const workflowMutation = useMutation({
    mutationFn: ({ serviceId, status }) => updateServiceWorkflow(serviceId, status),
    onSuccess: () => {
      toast.success('Production workflow updated');
      queryClient.invalidateQueries(['booking-detail', selectedBookingId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update workflow status');
    }
  });

  const serviceDataMutation = useMutation({
    mutationFn: ({ serviceId, payload }) => updateServiceData(serviceId, payload),
    onSuccess: () => {
      toast.success('Service assignments updated successfully');
      queryClient.invalidateQueries(['booking-detail', selectedBookingId]);
      setIsStaffModalOpen(false);
      setIsEquipmentModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  });

  // Flow Progression
  const handleAdvanceStatus = (bService) => {
    const stages = bService.serviceId?.workflows || bService.serviceSnapshot?.workflows || ['Pending', 'Delivered'];
    const currentIdx = stages.indexOf(bService.workflowStatus);
    
    if (currentIdx === -1 || currentIdx === stages.length - 1) {
      toast.success('Service workflow is already complete!');
      return;
    }

    const nextStatus = stages[currentIdx + 1];
    workflowMutation.mutate({ serviceId: bService._id, status: nextStatus });
  };

  const handleRollbackStatus = (bService) => {
    const stages = bService.serviceId?.workflows || bService.serviceSnapshot?.workflows || ['Pending', 'Delivered'];
    const currentIdx = stages.indexOf(bService.workflowStatus);
    
    if (currentIdx <= 0) return;

    const prevStatus = stages[currentIdx - 1];
    workflowMutation.mutate({ serviceId: bService._id, status: prevStatus });
  };

  // Staff Assignment Handler
  const openStaffModal = (serviceId) => {
    setActiveServiceId(serviceId);
    setIsStaffModalOpen(true);
  };

  const handleAssignStaff = (staffId) => {
    const bService = bookingServices.find(s => s._id === activeServiceId);
    if (!bService) return;

    const currentStaff = bService.assignedStaff?.map(s => s._id) || [];
    const isAssigned = currentStaff.includes(staffId);
    
    let updatedStaff;
    if (isAssigned) {
      updatedStaff = currentStaff.filter(id => id !== staffId);
    } else {
      updatedStaff = [...currentStaff, staffId];
    }

    serviceDataMutation.mutate({
      serviceId: activeServiceId,
      payload: { assignedStaff: updatedStaff }
    });
  };

  // Equipment Assignment Handler
  const openEquipmentModal = (serviceId) => {
    setActiveServiceId(serviceId);
    setIsEquipmentModalOpen(true);
  };

  const handleAssignEquipment = (eqId) => {
    const bService = bookingServices.find(s => s._id === activeServiceId);
    if (!bService) return;

    const currentEq = bService.assignedEquipment?.map(e => e._id || e) || [];
    const isAssigned = currentEq.includes(eqId);
    
    let updatedEq;
    if (isAssigned) {
      updatedEq = currentEq.filter(id => id !== eqId);
    } else {
      updatedEq = [...currentEq, eqId];
    }

    serviceDataMutation.mutate({
      serviceId: activeServiceId,
      payload: { assignedEquipment: updatedEq }
    });
  };

  // Checklist Sub-Task Manager
  const handleToggleTask = (bService, taskIdx) => {
    const updatedTasks = bService.tasks.map((t, idx) => {
      if (idx === taskIdx) {
        return { ...t, isCompleted: !t.isCompleted };
      }
      return t;
    });

    serviceDataMutation.mutate({
      serviceId: bService._id,
      payload: { tasks: updatedTasks }
    });
  };

  const handleAddSubtask = (bService) => {
    if (!newSubtaskTitle.trim()) return;
    
    const updatedTasks = [...(bService.tasks || []), { title: newSubtaskTitle.trim(), isCompleted: false }];
    
    serviceDataMutation.mutate({
      serviceId: bService._id,
      payload: { tasks: updatedTasks }
    }, {
      onSuccess: () => {
        setNewSubtaskTitle('');
        toast.success('Checklist item added');
      }
    });
  };

  const handleDeleteSubtask = (bService, taskIdx) => {
    const updatedTasks = bService.tasks.filter((_, idx) => idx !== taskIdx);
    
    serviceDataMutation.mutate({
      serviceId: bService._id,
      payload: { tasks: updatedTasks }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Sidebar Selector: Bookings list */}
      <div className="lg:col-span-1 space-y-4">
        <div className="h-14 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-wide">Select Event Project</h3>
        </div>

        <Input
          value={bookingSearch}
          onChange={(e) => setBookingSearch(e.target.value)}
          placeholder="Filter projects..."
          icon={Search}
          className="rounded-2xl"
        />

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {isBookingsLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-16 bg-white/[0.01] animate-pulse rounded-2xl" />
            ))
          ) : bookings.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">No active bookings logs</p>
          ) : (
            bookings.map((b) => {
              const isSelected = b._id === selectedBookingId;
              return (
                <div
                  key={b._id}
                  onClick={() => setSelectedBookingId(b._id)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${
                    isSelected
                      ? 'border-brand-light bg-[#1F1835] shadow shadow-brand/10'
                      : 'border-white/5 bg-[#171125] text-slate-400 hover:border-white/10 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-brand-light">{b.bookingNumber}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-bold border border-white/5">
                      {b.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs truncate mt-1">{b.customer?.name || 'Manual Project'}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(b.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Board Area */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Selected Booking Header */}
        {isDetailLoading ? (
          <div className="h-28 bg-[#171125] border border-white/5 rounded-3xl animate-pulse" />
        ) : !activeBooking ? (
          <div className="p-16 text-center text-slate-500 card">
            <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">No Project Loaded</p>
            <p className="text-sm mt-1">Select an event from the left-hand listing panel.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#171125] to-[#140e21] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-brand-light bg-brand/10 border border-brand/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  {activeBooking.bookingNumber}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Created {new Date(activeBooking.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1.5">{activeBooking.customer?.name}'s Event Booking</h2>
              {activeBooking.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">{activeBooking.notes}</p>}
            </div>

            <div className="flex items-center space-x-3.5 bg-white/[0.01] border border-white/5 p-3 rounded-2xl md:self-center">
              <Calendar className="w-5 h-5 text-brand-light flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Event Date Timeline</span>
                <span className="text-xs font-bold text-slate-200">
                  {new Date(activeBooking.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Services Workflow Grid Cards */}
        {bookingServices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-[#171125] rounded-3xl border border-white/5">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">No Services Booked</p>
            <p className="text-sm mt-1">Configure service configurations against this booking to track editing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookingServices.map((svc) => {
              const stages = svc.serviceId?.workflows || svc.serviceSnapshot?.workflows || ['Pending', 'Delivered'];
              const currentStageIdx = stages.indexOf(svc.workflowStatus);

              return (
                <Card key={svc._id} className="p-6 bg-[#171125] border-white/5 space-y-6 rounded-3xl shadow-xl shadow-black/15">
                  
                  {/* Service Header Info */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">{svc.serviceSnapshot?.name || svc.serviceId?.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand-light font-extrabold px-2 py-0.5 rounded">
                          ₹{svc.quotedPrice?.toLocaleString('en-IN')}
                        </span>
                        {svc.notes && <span className="text-[10px] text-slate-400 italic font-medium truncate max-w-[250px]">&bull; {svc.notes}</span>}
                      </div>
                    </div>

                    {/* Progress navigation controllers */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleRollbackStatus(svc)}
                        disabled={currentStageIdx <= 0}
                        variant="glass"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs text-slate-400 disabled:opacity-30"
                      >
                        Rollback
                      </Button>
                      <Button
                        onClick={() => handleAdvanceStatus(svc)}
                        disabled={currentStageIdx === stages.length - 1}
                        size="sm"
                        className="rounded-xl px-4 py-1.5 text-xs flex items-center space-x-1"
                      >
                        <span>Advance Stage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Horizontal visual stepper tracker */}
                  <div className="relative pt-4 pb-2">
                    <div className="absolute top-[31px] left-2.5 right-2.5 h-1 bg-white/5 rounded" />
                    <div
                      className="absolute top-[31px] left-2.5 h-1 bg-gradient-to-r from-brand-light to-brand rounded transition-all duration-300"
                      style={{
                        width: `${stages.length > 1 ? (currentStageIdx / (stages.length - 1)) * 98 : 0}%`
                      }}
                    />
                    
                    <div className="flex justify-between relative z-10">
                      {stages.map((stage, idx) => {
                        const isPast = idx < currentStageIdx;
                        const isCurrent = idx === currentStageIdx;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center space-y-2">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent
                                  ? 'bg-[#1E1835] border-brand-light text-brand-light shadow shadow-brand/20 scale-110'
                                  : isPast
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                  : 'bg-[#171125] border-white/10 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span
                              className={`text-[9px] uppercase tracking-wider font-extrabold text-center ${
                                isCurrent ? 'text-brand-light' : 'text-slate-500'
                              }`}
                            >
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Staff and Equipment Grid Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-4">
                    
                    {/* Crew / Staff Assignment Panel */}
                    <div className="space-y-3 bg-[#130f1f]/50 border border-white/5 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-4 h-4 text-brand-light" />
                          Crew Assignments
                        </h4>
                        <Button
                          onClick={() => openStaffModal(svc._id)}
                          variant="glass"
                          size="sm"
                          className="rounded-lg text-[10px] px-2 py-0.5 text-slate-400 hover:text-white"
                        >
                          Modify Crew
                        </Button>
                      </div>

                      {svc.assignedStaff?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {svc.assignedStaff.map((staff) => (
                            <span
                              key={staff._id}
                              className="text-[10px] font-bold bg-[#1C1630] border border-white/5 text-slate-200 px-3 py-1 rounded-full flex items-center space-x-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-light" />
                              <span>{staff.name} ({staff.role})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">No operators assigned. Click "Modify Crew" to assign crew.</p>
                      )}
                    </div>

                    {/* Equipment Catalog Assignment Panel */}
                    <div className="space-y-3 bg-[#130f1f]/50 border border-white/5 p-4 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Camera className="w-4 h-4 text-brand-light" />
                          Gear Allocation
                        </h4>
                        <Button
                          onClick={() => openEquipmentModal(svc._id)}
                          variant="glass"
                          size="sm"
                          className="rounded-lg text-[10px] px-2 py-0.5 text-slate-400 hover:text-white"
                        >
                          Modify Gear
                        </Button>
                      </div>

                      {svc.assignedEquipment?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {svc.assignedEquipment.map((eq) => (
                            <span
                              key={eq._id || eq}
                              className="text-[10px] font-bold bg-[#1C1630] border border-white/5 text-slate-200 px-3 py-1 rounded-full flex items-center space-x-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>{eq.name || 'Pre-allocated Gear'} ({eq.category || 'Other'})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">No equipment allocated. Click "Modify Gear" to allocate gear.</p>
                      )}
                    </div>
                  </div>

                  {/* Tasks list and Activity Log block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-4">
                    
                    {/* Tasks Checklist */}
                    <div className="space-y-3 bg-[#130f1f]/50 border border-white/5 p-4 rounded-2xl">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ListTodo className="w-4 h-4 text-brand-light" />
                        Sub-Tasks checklist ({svc.tasks?.filter(t => t.isCompleted).length || 0}/{svc.tasks?.length || 0})
                      </h4>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {svc.tasks?.map((task, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={task.isCompleted}
                                onChange={() => handleToggleTask(svc, idx)}
                                className="rounded bg-[#110b21] border-white/10 text-brand focus:ring-0 w-3.5 h-3.5"
                              />
                              <span className={`text-xs ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-300 font-medium'}`}>
                                {task.title}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(svc, idx)}
                              className="text-slate-600 hover:text-rose-400 p-0.5 rounded hover:bg-white/5"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new subtask inline */}
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Create sub-task (e.g. Color grade trailer)"
                          className="flex-1 bg-[#110b21] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-light"
                        />
                        <Button type="button" onClick={() => handleAddSubtask(svc)} size="sm" className="rounded-xl px-3 text-xs">
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible workflow history log */}
                    <div className="space-y-3 bg-[#130f1f]/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-4 h-4 text-brand-light" />
                          Activity Progression log
                        </h4>

                        <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                          {svc.workflowHistory?.slice().reverse().map((log, idx) => (
                            <div key={idx} className="flex items-start space-x-2 text-[10px] text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span>
                                  Stage set to <strong className="text-brand-light">{log.status}</strong> by {log.updatedBy?.name || 'System User'}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  {new Date(log.updatedAt).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* STAFF ASSIGNMENT MODAL */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Crew Assignment"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Select active crew members to assign to this service operational stream.</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {staffMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">No staff profiles registered</p>
            ) : (
              staffMembers.map((staff) => {
                const bService = bookingServices.find(s => s._id === activeServiceId);
                const currentStaff = bService?.assignedStaff?.map(s => s._id) || [];
                const isAssigned = currentStaff.includes(staff._id);

                return (
                  <div
                    key={staff._id}
                    onClick={() => handleAssignStaff(staff._id)}
                    className={`p-3.5 rounded-2xl cursor-pointer border flex justify-between items-center transition-all ${
                      isAssigned
                        ? 'border-brand-light bg-[#1E1835] text-brand-light'
                        : 'border-white/5 bg-[#110b21] hover:border-white/10 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{staff.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{staff.role} &bull; {staff.email}</p>
                    </div>
                    {isAssigned && <UserCheck className="w-4.5 h-4.5 text-brand-light" />}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="flex justify-end pt-3 border-t border-white/5">
            <Button onClick={() => setIsStaffModalOpen(false)} className="rounded-xl">
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* EQUIPMENT ASSIGNMENT MODAL */}
      <Modal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        title="Gear Allocation"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Select studio gear to allocate to this service operational stream.</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {equipmentInventory.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">No studio gear inventory logs</p>
            ) : (
              equipmentInventory.map((eq) => {
                const bService = bookingServices.find(s => s._id === activeServiceId);
                const currentEq = bService?.assignedEquipment?.map(e => e._id || e) || [];
                const isAllocated = currentEq.includes(eq._id);

                return (
                  <div
                    key={eq._id}
                    onClick={() => handleAssignEquipment(eq._id)}
                    className={`p-3.5 rounded-2xl cursor-pointer border flex justify-between items-center transition-all ${
                      isAllocated
                        ? 'border-brand-light bg-[#1E1835] text-brand-light'
                        : 'border-white/5 bg-[#110b21] hover:border-white/10 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{eq.name}</p>
                      <p className="text-[10px] text-slate-500">{eq.category} &bull; Serial: {eq.serialNumber || 'N/A'}</p>
                    </div>
                    {isAllocated && <Camera className="w-4.5 h-4.5 text-brand-light" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-white/5">
            <Button onClick={() => setIsEquipmentModalOpen(false)} className="rounded-xl">
              Done
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ProductionBoard;

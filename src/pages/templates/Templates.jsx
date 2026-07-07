import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/template.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Table, THead, TBody, TR, TH, TD } from '../../components/tables/Table';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Clock,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

const Templates = () => {
  const queryClient = useQueryClient();

  // Modal / Selection State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Nested Functions Timeline List builder
  const [functions, setFunctions] = useState([]);
  const [newFuncName, setNewFuncName] = useState('');
  const [newFuncOffset, setNewFuncOffset] = useState(0);
  const [newFuncStartTime, setNewFuncStartTime] = useState('10:00');
  const [newFuncEndTime, setNewFuncEndTime] = useState('14:00');
  const [newFuncNotes, setNewFuncNotes] = useState('');

  // Fetch presets query
  const { data, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
  });

  const templatesList = data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('Function template created successfully');
      queryClient.invalidateQueries(['templates']);
      closeTemplateModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create template');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateTemplate(id, payload),
    onSuccess: () => {
      toast.success('Function template updated successfully');
      queryClient.invalidateQueries(['templates']);
      closeTemplateModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update template');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      toast.success('Function template deleted successfully');
      queryClient.invalidateQueries(['templates']);
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete operation failed');
    }
  });

  // Modal triggers
  const openCreateModal = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setFunctions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setIsActive(template.isActive);
    setFunctions(template.functions || []);
    setIsModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  // Preset Functions timeline management
  const addFunctionToTimeline = () => {
    if (!newFuncName) {
      toast.error('Function Name is required');
      return;
    }

    // Validate 24h format
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(newFuncStartTime) || !timePattern.test(newFuncEndTime)) {
      toast.error('Time must be in HH:MM 24-hour format');
      return;
    }

    const funcObj = {
      name: newFuncName,
      offsetDays: parseInt(newFuncOffset, 10) || 0,
      defaultStartTime: newFuncStartTime,
      defaultEndTime: newFuncEndTime,
      notes: newFuncNotes
    };

    setFunctions([...functions, funcObj]);
    setNewFuncName('');
    setNewFuncOffset(0);
    setNewFuncStartTime('10:00');
    setNewFuncEndTime('14:00');
    setNewFuncNotes('');
    toast.success('Timeline function configured');
  };

  const removeFunctionFromTimeline = (index) => {
    setFunctions(functions.filter((_, idx) => idx !== index));
  };

  const moveFunction = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === functions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...functions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setFunctions(updated);
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Template Name is required');
      return;
    }

    const payload = {
      name,
      description,
      isActive,
      functions
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header and top banners */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-brand-light" />
            Timeline Preset Templates
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Build timeline presets (e.g. Wedding, Birthday) to auto-initialize event timelines on booking.
          </p>
        </div>
        <Button onClick={openCreateModal} className="rounded-2xl flex items-center space-x-2">
          <Plus className="w-4.5 h-4.5" />
          <span>New Preset Template</span>
        </Button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="h-44 bg-[#171125] animate-pulse rounded-3xl border border-white/5" />
          ))
        ) : error ? (
          <div className="col-span-full p-12 text-center text-slate-500 card">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">Error loading templates</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : templatesList.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-500 bg-[#171125] rounded-3xl border border-white/5">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">No Templates Defined</p>
            <p className="text-sm mt-1">Click "New Preset Template" to create event templates.</p>
          </div>
        ) : (
          templatesList.map((tpl) => (
            <Card key={tpl._id} className="p-6 flex flex-col justify-between h-full bg-[#171125] border border-white/5 hover:border-brand-light/35 transition-all duration-300 rounded-3xl shadow-xl shadow-black/20">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-white tracking-wide">{tpl.name}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      tpl.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {tpl.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                  {tpl.description || 'No description provided.'}
                </p>

                <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Configured Functions Timeline</p>
                  
                  {tpl.functions?.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {tpl.functions.map((fn, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-300 py-0.5">
                          <span className="font-medium truncate max-w-[170px]">&bull; {fn.name}</span>
                          <span className="text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-md">
                            Day Offset: {fn.offsetDays >= 0 ? `+${fn.offsetDays}` : fn.offsetDays} ({fn.defaultStartTime}-{fn.defaultEndTime})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">No functions configured in this template.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-white/5 pt-4 mt-4">
                <Button
                  onClick={() => openEditModal(tpl)}
                  variant="glass"
                  size="sm"
                  className="rounded-xl flex items-center space-x-1.5 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Template</span>
                </Button>
                <Button
                  onClick={() => setDeleteId(tpl._id)}
                  variant="glass"
                  size="sm"
                  className="rounded-xl p-2.5 hover:text-rose-400 hover:border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeTemplateModal}
        title={editingTemplate ? 'Edit Preset Template' : 'Create Preset Template'}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. standard Wedding Preset, Premium Corporate Preset"
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the events timeline mapped by this preset..."
              className="w-full bg-[#110b21] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/10 h-20 resize-none"
            />
          </div>

          {/* Functions Sub-Builder */}
          <div className="border border-white/5 rounded-3xl p-6 bg-[#161025] space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CalendarDays className="w-4.5 h-4.5 text-brand-light" />
                Timelines Sequence configurator
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure default timeline slots. Day offsets are computed relative to booking start dates.
              </p>
            </div>

            {/* List configured functions */}
            {functions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {functions.map((fn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[#110b21] rounded-2xl border border-white/5 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{fn.name}</span>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[9px] font-bold bg-[#1C1630] text-brand-light px-2 py-0.5 rounded">
                          Day Offset: {fn.offsetDays}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          {fn.defaultStartTime} to {fn.defaultEndTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => moveFunction(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFunction(idx, 'down')}
                        disabled={idx === functions.length - 1}
                        className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFunctionFromTimeline(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No timeline functions configured. Setup function coordinates below.</p>
            )}

            {/* Function config input box */}
            <div className="border-t border-white/5 pt-4 space-y-4">
              <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Configure Preset Function</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Function Name"
                  value={newFuncName}
                  onChange={(e) => setNewFuncName(e.target.value)}
                  placeholder="e.g. Mehndi, Haldi, main Ceremony"
                />
                <Input
                  label="Calendar Day Offset"
                  type="number"
                  value={newFuncOffset}
                  onChange={(e) => setNewFuncOffset(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 0 (Wedding Day), -1 (Mehndi is previous day)"
                  helpText="Use negative integers for pre-event days, positive for post-event days."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Default Start Time (24h)"
                  value={newFuncStartTime}
                  onChange={(e) => setNewFuncStartTime(e.target.value)}
                  placeholder="e.g. 10:00"
                />
                <Input
                  label="Default End Time (24h)"
                  value={newFuncEndTime}
                  onChange={(e) => setNewFuncEndTime(e.target.value)}
                  placeholder="e.g. 14:00"
                />
              </div>

              <Input
                label="Function Default Notes (Optional)"
                value={newFuncNotes}
                onChange={(e) => setNewFuncNotes(e.target.value)}
                placeholder="e.g. Setup photobooth and traditional audio."
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={addFunctionToTimeline}
                  variant="glass"
                  size="sm"
                  className="rounded-xl flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Insert Timeline Function</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-[#110b21] border-white/10 text-brand-light w-4.5 h-4.5"
                />
                <span className="text-sm font-semibold text-slate-200">Active (available in booking templates dropdown)</span>
              </label>
            </div>
            
            <div className="flex space-x-3">
              <Button type="button" onClick={closeTemplateModal} variant="glass" className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                loading={createMutation.isLoading || updateMutation.isLoading}
              >
                {editingTemplate ? 'Save Configurations' : 'Publish Template'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Preset Template"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete this preset template? Existing bookings using this template will not be affected.
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

export default Templates;

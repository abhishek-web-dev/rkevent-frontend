import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServices, createService, updateService, deleteService } from '../../api/service.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../components/tables/Table';
import toast from 'react-hot-toast';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Search,
  Sparkles,
  List,
  AlertCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  MinusCircle,
  Check
} from 'lucide-react';

const Services = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Delete confirm states
  const [deleteId, setDeleteId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  // Workflows states (starts with defaults)
  const [workflows, setWorkflows] = useState(['Pending', 'In Progress', 'Completed', 'Delivered']);
  const [newWorkflowStage, setNewWorkflowStage] = useState('');

  // Dynamic Fields Builder states
  const [fields, setFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('Text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
  const [newFieldOptionsString, setNewFieldOptionsString] = useState(''); // comma-separated for options

  // Search input change handler
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    const timeout = setTimeout(() => {
      setDebouncedSearch(val);
    }, 400);
    return () => clearTimeout(timeout);
  };

  // Query catalog
  const { data, isLoading, error } = useQuery({
    queryKey: ['services', debouncedSearch],
    queryFn: () => getServices({ search: debouncedSearch }),
  });

  const servicesList = data?.data?.services || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      toast.success('Service Master created successfully');
      queryClient.invalidateQueries(['services']);
      closeServiceModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create service');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    onSuccess: () => {
      toast.success('Service Master updated successfully');
      queryClient.invalidateQueries(['services']);
      closeServiceModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update service');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success('Service Master deleted successfully');
      queryClient.invalidateQueries(['services']);
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Delete operation failed');
    }
  });

  // Open modal for Create
  const openCreateModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setBasePrice(0);
    setIsActive(true);
    setWorkflows(['Pending', 'In Progress', 'Completed', 'Delivered']);
    setFields([]);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setBasePrice(service.basePrice || 0);
    setIsActive(service.isActive);
    setWorkflows(service.workflows || []);
    setFields(service.fields || []);
    setIsModalOpen(true);
  };

  const closeServiceModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  // Dynamic Fields Operations
  const addField = () => {
    if (!newFieldName || !newFieldLabel) {
      toast.error('Field key identifier and Display Label are required');
      return;
    }

    // Check if key starts with alphanumeric and camelCase validation
    if (!/^[a-zA-Z0-9_]+$/.test(newFieldName)) {
      toast.error('Field key must be alphanumeric (e.g. albumSize, no spaces)');
      return;
    }

    if (fields.some(f => f.name === newFieldName)) {
      toast.error('A field with this identifier key already exists in this service');
      return;
    }

    const options = newFieldOptionsString
      ? newFieldOptionsString.split(',').map(o => o.trim()).filter(o => o.length > 0)
      : [];

    const fieldObj = {
      name: newFieldName,
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder,
      helpText: newFieldHelpText,
      defaultValue: newFieldDefaultValue || null,
      validation: {
        min: null,
        max: null,
        pattern: '',
        options
      },
      order: fields.length
    };

    setFields([...fields, fieldObj]);

    // Reset new field fields
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('Text');
    setNewFieldRequired(false);
    setNewFieldPlaceholder('');
    setNewFieldHelpText('');
    setNewFieldDefaultValue('');
    setNewFieldOptionsString('');
    toast.success('Custom field configuration added');
  };

  const removeField = (index) => {
    const updated = fields.filter((_, idx) => idx !== index);
    setFields(updated);
  };

  const moveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    
    // Swap elements
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Recalculate order values
    updated.forEach((f, idx) => {
      f.order = idx;
    });

    setFields(updated);
  };

  // Workflow stages operations
  const addWorkflowStage = () => {
    if (!newWorkflowStage.trim()) return;
    if (workflows.includes(newWorkflowStage.trim())) {
      toast.error('Workflow stage already exists');
      return;
    }
    setWorkflows([...workflows, newWorkflowStage.trim()]);
    setNewWorkflowStage('');
  };

  const removeWorkflowStage = (index) => {
    if (workflows.length <= 1) {
      toast.error('Service must have at least one workflow stage');
      return;
    }
    setWorkflows(workflows.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Service Name is required');
      return;
    }

    const payload = {
      name,
      description,
      basePrice,
      isActive,
      workflows,
      fields
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-8 h-8 text-brand-light" />
            Services Master Configuration
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Configure dynamic fields, price schedules, and tracking workflows.
          </p>
        </div>
        <Button onClick={openCreateModal} className="rounded-2xl flex items-center space-x-2">
          <Plus className="w-4.5 h-4.5" />
          <span>New Service Master</span>
        </Button>
      </div>

      {/* Catalog Search & Filtering */}
      <Card className="p-0">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
          <div className="w-full md:max-w-md">
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search services catalog..."
              icon={Search}
              className="rounded-2xl py-2.5"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3.5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 bg-white/[0.01] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">Error loading catalog details</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : servicesList.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="font-semibold text-slate-300">No Services Defined</p>
            <p className="text-sm mt-1">Click "New Service Master" to register your first service.</p>
          </div>
        ) : (
          <div className="p-6">
            <Table>
              <THead>
                <TR>
                  <TH>Service Name</TH>
                  <TH>Base Price</TH>
                  <TH>Workflows Stages</TH>
                  <TH>Dynamic Fields Count</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {servicesList.map((service) => (
                  <TR key={service._id}>
                    <TD className="font-bold text-white">{service.name}</TD>
                    <TD className="text-brand-light font-semibold">₹{service.basePrice.toLocaleString('en-IN')}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {service.workflows.map((flow, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold bg-[#1C1630] border border-white/5 text-purple-300 px-2 py-0.5 rounded-full"
                          >
                            {flow}
                          </span>
                        ))}
                      </div>
                    </TD>
                    <TD className="text-slate-300 font-semibold">{service.fields?.length || 0} fields</TD>
                    <TD>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          service.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          onClick={() => openEditModal(service)}
                          variant="glass"
                          size="sm"
                          className="rounded-xl p-2 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(service._id)}
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
          </div>
        )}
      </Card>

      {/* CREATE / EDIT SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeServiceModal}
        title={editingService ? 'Edit Service Master' : 'Create Service Master'}
        className="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Service Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cinematic Wedding Video, Premium Album"
                required
              />
            </div>
            <div>
              <Input
                label="Base Price (₹)"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 25000"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of this service..."
              className="w-full bg-[#110b21] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/10 h-20 resize-none"
            />
          </div>

          {/* Workflow Stages Editor Card */}
          <div className="border border-white/5 rounded-3xl p-6 bg-[#161025] space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <List className="w-4 h-4 text-brand-light" />
                Workflows Progression Pipeline
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Specify successive editing or execution stages (e.g. Design &rarr; Printing &rarr; Delivered).
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWorkflowStage}
                onChange={(e) => setNewWorkflowStage(e.target.value)}
                placeholder="Add workflow stage (e.g. Editing)"
                className="flex-1 bg-[#110b21] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-light"
              />
              <Button type="button" onClick={addWorkflowStage} size="sm" className="rounded-xl">
                Add Stage
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {workflows.map((flow, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1630] border border-white/5 text-xs text-brand-light"
                >
                  <span>{flow}</span>
                  <button
                    type="button"
                    onClick={() => removeWorkflowStage(idx)}
                    className="text-slate-500 hover:text-rose-400 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Fields Configuration Cards Layout */}
          <div className="border border-white/5 rounded-3xl p-6 bg-[#161025] space-y-5">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-brand-light" />
                Dynamic Fields Configurator
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Define the dynamic inputs generated during booking forms (e.g. dropdown values, text fields).
              </p>
            </div>

            {/* List of active defined fields */}
            {fields.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fields.map((f, idx) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between p-3.5 bg-[#110b21] rounded-2xl border border-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-white font-bold">{f.label} <span className="text-[10px] text-slate-400">({f.name})</span></span>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[9px] font-semibold bg-brand/10 border border-brand/20 text-brand-light px-2 py-0.5 rounded">
                          {f.type}
                        </span>
                        {f.required && (
                          <span className="text-[9px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                        {f.validation?.options?.length > 0 && (
                          <span className="text-[9px] text-slate-500">
                            Options: {f.validation.options.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => moveField(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(idx, 'down')}
                        disabled={idx === fields.length - 1}
                        className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No custom dynamic fields defined. Configure field settings below.</p>
            )}

            {/* Field Creator section */}
            <div className="border-t border-white/5 pt-4 space-y-4">
              <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Configure Custom Field</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Field Key Identifier"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. albumSize (camelCase)"
                />
                <Input
                  label="Field Display Label"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="e.g. Album Size"
                />
                <Select
                  label="Field Type"
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  options={[
                    { value: 'Text', label: 'Text Input' },
                    { value: 'Number', label: 'Number Input' },
                    { value: 'Dropdown', label: 'Dropdown Selector' },
                    { value: 'Checkbox', label: 'Checkboxes List' },
                    { value: 'Radio', label: 'Radio Select' },
                    { value: 'Switch', label: 'Toggle Switch' },
                    { value: 'Multi Select', label: 'Multi-Select list' },
                    { value: 'Date', label: 'Date Picker' },
                    { value: 'Time', label: 'Time Picker' },
                    { value: 'DateTime', label: 'Date Time Picker' },
                    { value: 'Textarea', label: 'Large Text Area' },
                    { value: 'URL', label: 'URL Address' },
                    { value: 'Phone', label: 'Phone Number' },
                    { value: 'Email', label: 'Email Address' }
                  ]}
                />
              </div>

              {/* Show options comma-separated for selection-based elements */}
              {['Dropdown', 'Radio', 'Checkbox', 'Multi Select'].includes(newFieldType) && (
                <Input
                  label="Options List (Comma separated)"
                  value={newFieldOptionsString}
                  onChange={(e) => setNewFieldOptionsString(e.target.value)}
                  placeholder="e.g. Matte Finish, Glossy, Leather, Glass Cover"
                  helpText="Provide options separated by commas."
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Input Placeholder (Optional)"
                  value={newFieldPlaceholder}
                  onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                  placeholder="e.g. Enter pages count..."
                />
                <Input
                  label="Default Value (Optional)"
                  value={newFieldDefaultValue}
                  onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                  placeholder="e.g. 40"
                />
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="rounded bg-[#110b21] border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-300 tracking-wide">Mark as Required Field</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={addField}
                  variant="glass"
                  size="sm"
                  className="rounded-xl flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Insert Field Config</span>
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
                  className="rounded bg-[#110b21] border-white/10 text-brand-light focus:ring-0 w-4.5 h-4.5"
                />
                <span className="text-sm font-semibold text-slate-200">Active catalog item (available in bookings)</span>
              </label>
            </div>
            <div className="flex space-x-3">
              <Button type="button" onClick={closeServiceModal} variant="glass" className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                loading={createMutation.isLoading || updateMutation.isLoading}
              >
                {editingService ? 'Save Configurations' : 'Publish Service'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Service Master"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to permanently delete this Service Master configuration? This action cannot be undone. 
            <br />
            <span className="text-xs text-amber-400 font-bold block mt-1.5">
              Warning: New bookings will no longer be able to select this service.
            </span>
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

export default Services;

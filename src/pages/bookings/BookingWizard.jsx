import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCustomers, createCustomer } from '../../api/customer.api';
import { getTemplates } from '../../api/template.api';
import { getServices } from '../../api/service.api';
import { createBooking } from '../../api/booking.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import toast from 'react-hot-toast';
import {
  User,
  Calendar,
  Layers,
  Settings,
  ClipboardList,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Customer', icon: User },
  { id: 2, title: 'Details', icon: Calendar },
  { id: 3, title: 'Template', icon: Sparkles },
  { id: 4, title: 'Timeline', icon: Clock },
  { id: 5, title: 'Services', icon: Layers },
  { id: 6, title: 'Configure', icon: Settings },
  { id: 7, title: 'Review', icon: ClipboardList }
];

const AUTOSAVE_KEY = 'rk_booking_wizard_draft';

const BookingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Customer State
  const [customerMode, setCustomerMode] = useState('select'); // 'select' or 'create'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAltPhone, setNewCustAltPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('');
  const [newCustPincode, setNewCustPincode] = useState('');

  // STEP 2: Booking Details State
  const [bookingName, setBookingName] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // STEP 3: Template State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // STEP 4: Timeline Functions State
  const [functions, setFunctions] = useState([]);
  
  // STEP 5: Selected Services State
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // STEP 6: Dynamic Services Configurations State
  // Format: { [serviceId]: { quotedPrice: Number, dynamicData: { key: value }, functionIndexes: [Number], notes: String } }
  const [servicesConfig, setServicesConfig] = useState({});

  // Fetch helpers
  const { data: customerData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomers({ page: 1, limit: 100 })
  });
  const customers = customerData?.data?.customers || [];

  const { data: templateData } = useQuery({
    queryKey: ['templates-list'],
    queryFn: () => getTemplates({ activeOnly: true })
  });
  const templates = templateData?.data || [];

  const { data: serviceMasterData } = useQuery({
    queryKey: ['services-master-list'],
    queryFn: () => getServices({ page: 1, limit: 100, activeOnly: true })
  });
  const servicesMaster = serviceMasterData?.data?.services || [];

  // Autosave Draft Loader
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.customerMode) setCustomerMode(draft.customerMode);
        if (draft.selectedCustomerId) setSelectedCustomerId(draft.selectedCustomerId);
        if (draft.newCustName) setNewCustName(draft.newCustName);
        if (draft.newCustPhone) setNewCustPhone(draft.newCustPhone);
        if (draft.newCustAltPhone) setNewCustAltPhone(draft.newCustAltPhone);
        if (draft.newCustEmail) setNewCustEmail(draft.newCustEmail);
        if (draft.newCustAddress) setNewCustAddress(draft.newCustAddress);
        if (draft.newCustCity) setNewCustCity(draft.newCustCity);
        if (draft.newCustState) setNewCustState(draft.newCustState);
        if (draft.newCustPincode) setNewCustPincode(draft.newCustPincode);
        if (draft.bookingName) setBookingName(draft.bookingName);
        if (draft.eventType) setEventType(draft.eventType);
        if (draft.startDate) setStartDate(draft.startDate);
        if (draft.endDate) setEndDate(draft.endDate);
        if (draft.bookingNotes) setBookingNotes(draft.bookingNotes);
        if (draft.selectedTemplateId) setSelectedTemplateId(draft.selectedTemplateId);
        if (draft.functions) setFunctions(draft.functions);
        if (draft.selectedServiceIds) setSelectedServiceIds(draft.selectedServiceIds);
        if (draft.servicesConfig) setServicesConfig(draft.servicesConfig);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        toast.success('Loaded saved booking draft');
      } catch (err) {
        console.warn('Failed to parse wizard draft:', err.message);
      }
    }
  }, []);

  // Autosave Draft Saver
  const saveDraft = (updatedStep = currentStep) => {
    const draft = {
      customerMode,
      selectedCustomerId,
      newCustName,
      newCustPhone,
      newCustAltPhone,
      newCustEmail,
      newCustAddress,
      newCustCity,
      newCustState,
      newCustPincode,
      bookingName,
      eventType,
      startDate,
      endDate,
      bookingNotes,
      selectedTemplateId,
      functions,
      selectedServiceIds,
      servicesConfig,
      currentStep: updatedStep
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  };

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
  };

  // Step Navigations & Validations
  const validateStep = (step) => {
    if (step === 1) {
      if (customerMode === 'select' && !selectedCustomerId) {
        toast.error('Please select an existing customer');
        return false;
      }
      if (customerMode === 'create') {
        if (!newCustName.trim() || !newCustPhone.trim()) {
          toast.error('Customer Name and Phone Number are required');
          return false;
        }
      }
    }
    if (step === 2) {
      if (!bookingName.trim() || !startDate || !endDate) {
        toast.error('Booking Name, Start Date, and End Date are required');
        return false;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error('Start Date must be before or equal to End Date');
        return false;
      }
    }
    if (step === 4) {
      if (functions.length === 0) {
        toast.error('Please configure at least one timeline function');
        return false;
      }
      for (const fn of functions) {
        if (!fn.name.trim() || !fn.date) {
          toast.error('All timeline functions must have a name and a date');
          return false;
        }
      }
    }
    if (step === 5) {
      if (selectedServiceIds.length === 0) {
        toast.error('Please select at least one service');
        return false;
      }
    }
    if (step === 6) {
      // Validate dynamic fields are correctly bound & required items exist
      for (const serviceId of selectedServiceIds) {
        const config = servicesConfig[serviceId] || {};
        const serviceDef = servicesMaster.find(s => s._id === serviceId);
        if (!serviceDef) continue;

        // Ensure mapping is selected
        if (!config.functionIndexes || config.functionIndexes.length === 0) {
          toast.error(`Please assign service "${serviceDef.name}" to at least one function`);
          return false;
        }

        // Validate required dynamic fields
        const dynamicVal = config.dynamicData || {};
        for (const field of serviceDef.fields || []) {
          if (field.required && (dynamicVal[field.name] === undefined || dynamicVal[field.name] === '')) {
            toast.error(`Field "${field.label}" is required for service "${serviceDef.name}"`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveDraft(next);
    }
  };

  const handlePrev = () => {
    const prev = currentStep - 1;
    setCurrentStep(prev);
    saveDraft(prev);
  };

  // STEP 3 Handler: Load template values
  const handleTemplateSelection = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setFunctions([]);
      return;
    }

    const tpl = templates.find(t => t._id === templateId);
    if (tpl && startDate) {
      const compiled = tpl.functions.map(tf => {
        const fDate = new Date(startDate);
        fDate.setDate(fDate.getDate() + tf.offsetDays);
        return {
          name: tf.name,
          date: fDate.toISOString().split('T')[0],
          startTime: tf.defaultStartTime || '10:00',
          endTime: tf.defaultEndTime || '14:00',
          venue: '',
          address: '',
          contactPerson: '',
          contactNumber: '',
          specialInstructions: '',
          notes: tf.notes || ''
        };
      });
      setFunctions(compiled);
      toast.success(`Timeline loaded from template: ${tpl.name}`);
    }
  };

  // STEP 4 Helpers: Add / edit timeline functions
  const addTimelineFunction = () => {
    const newFn = {
      name: 'New Function',
      date: startDate || new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '14:00',
      venue: '',
      address: '',
      contactPerson: '',
      contactNumber: '',
      specialInstructions: '',
      notes: ''
    };
    setFunctions([...functions, newFn]);
  };

  const deleteTimelineFunction = (index) => {
    setFunctions(functions.filter((_, idx) => idx !== index));
    // Clear mappings in services config to prevent stale pointer index errors
    const updated = { ...servicesConfig };
    Object.keys(updated).forEach(svcId => {
      if (updated[svcId].functionIndexes) {
        updated[svcId].functionIndexes = updated[svcId].functionIndexes
          .filter(idx => idx !== index)
          .map(idx => (idx > index ? idx - 1 : idx));
      }
    });
    setServicesConfig(updated);
  };

  const handleFunctionFieldChange = (index, field, value) => {
    const updated = [...functions];
    updated[index][field] = value;
    setFunctions(updated);
  };

  // STEP 5 / 6 Helpers: Select service and setup initial config
  const toggleServiceSelection = (serviceId) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    let updated;
    if (isSelected) {
      updated = selectedServiceIds.filter(id => id !== serviceId);
      const copy = { ...servicesConfig };
      delete copy[serviceId];
      setServicesConfig(copy);
    } else {
      updated = [...selectedServiceIds, serviceId];
      const master = servicesMaster.find(s => s._id === serviceId);
      const copy = { ...servicesConfig };
      copy[serviceId] = {
        quotedPrice: master?.basePrice || 0,
        dynamicData: {},
        functionIndexes: [0], // Default map to first function
        notes: ''
      };
      setServicesConfig(copy);
    }
    setSelectedServiceIds(updated);
  };

  const handleServiceFieldChange = (serviceId, path, value) => {
    const copy = { ...servicesConfig };
    if (!copy[serviceId]) copy[serviceId] = { quotedPrice: 0, dynamicData: {}, functionIndexes: [], notes: '' };
    
    if (path.startsWith('dynamicData.')) {
      const key = path.split('.')[1];
      if (!copy[serviceId].dynamicData) copy[serviceId].dynamicData = {};
      copy[serviceId].dynamicData[key] = value;
    } else {
      copy[serviceId][path] = value;
    }
    setServicesConfig(copy);
  };

  const toggleServiceFunctionMapping = (serviceId, funcIdx) => {
    const copy = { ...servicesConfig };
    const currentMappings = copy[serviceId].functionIndexes || [];
    if (currentMappings.includes(funcIdx)) {
      copy[serviceId].functionIndexes = currentMappings.filter(idx => idx !== funcIdx);
    } else {
      copy[serviceId].functionIndexes = [...currentMappings, funcIdx];
    }
    setServicesConfig(copy);
  };

  // STEP 8: Create Booking Mutation
  const createCustomerMutation = useMutation({
    mutationFn: createCustomer
  });

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      toast.success('Event Booking successfully generated!');
      clearDraft();
      navigate('/bookings');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Booking generation failed');
    }
  });

  const handleFinalSubmit = async () => {
    try {
      let finalCustomerId = selectedCustomerId;

      // 1. Create customer if in create mode
      if (customerMode === 'create') {
        const custRes = await createCustomerMutation.mutateAsync({
          name: newCustName,
          phone: newCustPhone,
          alternatePhone: newCustAltPhone,
          email: newCustEmail,
          address: newCustAddress,
          city: newCustCity,
          state: newCustState,
          pincode: newCustPincode
        });
        finalCustomerId = custRes.data._id;
        toast.success(`Customer record generated for ${newCustName}`);
      }

      // 2. Format Services Payload
      const formattedServices = selectedServiceIds.map(svcId => {
        const config = servicesConfig[svcId] || {};
        return {
          serviceId: svcId,
          quotedPrice: config.quotedPrice,
          functionIndexes: config.functionIndexes || [],
          dynamicData: config.dynamicData || {},
          notes: config.notes || ''
        };
      });

      // 3. Dispatch Booking Payload
      const bookingPayload = {
        customer: finalCustomerId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes: bookingNotes,
        templateUsed: selectedTemplateId || undefined,
        functions,
        services: formattedServices
      };

      createBookingMutation.mutate(bookingPayload);

    } catch (err) {
      toast.error(err.message || 'Workflow creation pipeline encountered errors');
    }
  };

  // Calculations
  const calculateTotalBookingPrice = () => {
    return selectedServiceIds.reduce((sum, id) => {
      return sum + (parseFloat(servicesConfig[id]?.quotedPrice) || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Booking Wizard</h2>
        <p className="text-slate-400 text-sm mt-1">Configure clients, timelines, workflows, and quote parameters.</p>
      </div>

      {/* Stepper Panel */}
      <div className="hidden lg:grid grid-cols-7 gap-1">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div
              key={step.id}
              className={`p-4 border-b-4 flex flex-col items-center space-y-1.5 transition-all duration-200 ${
                isActive
                  ? 'border-brand-light bg-[#1E1835] text-brand-light'
                  : isCompleted
                  ? 'border-emerald-500/50 bg-[#131123] text-emerald-400'
                  : 'border-white/5 bg-[#171125] text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* STEP CONTENT SWITCHBOARD */}
      <div className="min-h-[400px]">
        {/* STEP 1: CUSTOMER */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-6 space-y-6 bg-[#171125] border-white/5">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white">Step 1: Customer Account Profile</h3>
                <div className="flex bg-[#110b21] p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('select')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      customerMode === 'select'
                        ? 'bg-brand text-white shadow shadow-brand/10'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Select Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('create')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      customerMode === 'create'
                        ? 'bg-brand text-white shadow shadow-brand/10'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {customerMode === 'select' ? (
                <div className="space-y-4">
                  <Select
                    label="Choose Customer Account"
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      const target = customers.find(c => c._id === e.target.value);
                      if (target && !bookingName) {
                        setBookingName(`${target.name}'s Wedding Event`);
                      }
                    }}
                    options={[
                      { value: '', label: 'Select client profile...' },
                      ...customers.map(c => ({ value: c._id, label: `${c.name} (${c.phone})` }))
                    ]}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Customer Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="e.g. Priyanshu Shrivastava"
                    />
                    <Input
                      label="Phone Number *"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Alternate Phone"
                      value={newCustAltPhone}
                      onChange={(e) => setNewCustAltPhone(e.target.value)}
                      placeholder="e.g. 9876543211"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="e.g. client@example.com"
                    />
                  </div>
                  <Input
                    label="Address"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Civil Lines, Jhansi"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      value={newCustCity}
                      onChange={(e) => setNewCustCity(e.target.value)}
                      placeholder="e.g. Jhansi"
                    />
                    <Input
                      label="State"
                      value={newCustState}
                      onChange={(e) => setNewCustState(e.target.value)}
                      placeholder="e.g. Uttar Pradesh"
                    />
                    <Input
                      label="Pincode"
                      value={newCustPincode}
                      onChange={(e) => setNewCustPincode(e.target.value)}
                      placeholder="e.g. 284001"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* STEP 2: BOOKING DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-6 space-y-6 bg-[#171125] border-white/5">
              <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">Step 2: Operational Project Metadata</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Booking Project Name *"
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="e.g. Shivam & Ruchi Wedding Event"
                />
                <Select
                  label="Event Type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  options={[
                    { value: 'Wedding', label: 'Wedding' },
                    { value: 'Engagement', label: 'Engagement' },
                    { value: 'Pre-Wedding', label: 'Pre-Wedding' },
                    { value: 'Birthday', label: 'Birthday Party' },
                    { value: 'Corporate', label: 'Corporate Event' },
                    { value: 'Sangeet Only', label: 'Sangeet Ceremony' },
                    { value: 'Custom', label: 'Custom Occasion' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Timeline Start Date *"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="Timeline End Date *"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  General Project Notes
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Detail client specifications, logistics pointers, key contact info..."
                  className="w-full bg-[#110b21] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-brand-light h-24 resize-none"
                />
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: SELECT TEMPLATE */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-6 space-y-6 bg-[#171125] border-white/5">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white">Step 3: Timeline Preset Template Selection</h3>
                <p className="text-xs text-slate-400 mt-1">Select templates to auto-initialize event timelines relative to start dates.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Select
                    label="Choose Template Preset"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelection(e.target.value)}
                    options={[
                      { value: '', label: 'Custom timeline (Configure manually in next step)' },
                      ...templates.map(t => ({ value: t._id, label: t.name }))
                    ]}
                  />
                  <div className="p-4 bg-[#110b21] rounded-2xl border border-white/5 text-xs text-slate-400 flex items-start space-x-2">
                    <Info className="w-5 h-5 text-brand-light flex-shrink-0 mt-0.5" />
                    <span>
                      Selecting a template automatically calculates date offsets (e.g. Mehndi scheduled for 1 day before event start date).
                    </span>
                  </div>
                </div>

                {/* Template preview details */}
                <div className="border border-white/5 rounded-2xl p-4 bg-[#110b21] min-h-[150px] flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Preset Preview</h4>
                    {selectedTemplateId ? (
                      (() => {
                        const target = templates.find(t => t._id === selectedTemplateId);
                        return (
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-white">{target?.name}</p>
                            <p className="text-xs text-slate-400 leading-relaxed">{target?.description || 'No description'}</p>
                            <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
                              {target?.functions?.map((fn, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-slate-300">
                                  <span>&bull; {fn.name}</span>
                                  <span className="text-slate-500">Offset: {fn.offsetDays}d ({fn.defaultStartTime}-{fn.defaultEndTime})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-slate-500 italic">No template selected. You will build timeline events from scratch in Step 4.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 4: REVIEW & EDIT TIMELINE FUNCTIONS */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-6 space-y-6 bg-[#171125] border-white/5">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Step 4: Scheduling & Timelines Planner</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure event sequences, specify coordinators, venues, and notes.</p>
                </div>
                <Button type="button" onClick={addTimelineFunction} variant="glass" size="sm" className="rounded-xl flex items-center space-x-1">
                  <Plus className="w-4 h-4" />
                  <span>Add Function</span>
                </Button>
              </div>

              {functions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#110b21] rounded-2xl border border-white/5">
                  <p className="font-semibold text-slate-300">No scheduled timeline functions</p>
                  <p className="text-xs mt-1">Click "Add Function" to start building schedules.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {functions.map((fn, idx) => (
                    <div
                      key={idx}
                      className="border border-white/5 rounded-3xl p-5 bg-[#140e21] relative space-y-4"
                    >
                      <button
                        type="button"
                        onClick={() => deleteTimelineFunction(idx)}
                        className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/5"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>

                      <div className="text-xs font-bold text-brand-light uppercase tracking-wider">
                        Function #{idx + 1}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Function Name *"
                          value={fn.name}
                          onChange={(e) => handleFunctionFieldChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Sangeet Ceremony"
                        />
                        <Input
                          label="Date *"
                          type="date"
                          value={fn.date}
                          onChange={(e) => handleFunctionFieldChange(idx, 'date', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            label="Start Time"
                            value={fn.startTime}
                            onChange={(e) => handleFunctionFieldChange(idx, 'startTime', e.target.value)}
                            placeholder="16:00"
                          />
                          <Input
                            label="End Time"
                            value={fn.endTime}
                            onChange={(e) => handleFunctionFieldChange(idx, 'endTime', e.target.value)}
                            placeholder="22:00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Venue Location"
                          value={fn.venue}
                          onChange={(e) => handleFunctionFieldChange(idx, 'venue', e.target.value)}
                          placeholder="e.g. Celebration Hall"
                        />
                        <Input
                          label="Address"
                          value={fn.address}
                          onChange={(e) => handleFunctionFieldChange(idx, 'address', e.target.value)}
                          placeholder="e.g. Rajgarh, Jhansi"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            label="Contact Person"
                            value={fn.contactPerson}
                            onChange={(e) => handleFunctionFieldChange(idx, 'contactPerson', e.target.value)}
                            placeholder="e.g. Rajesh Kumar"
                          />
                          <Input
                            label="Contact Number"
                            value={fn.contactNumber}
                            onChange={(e) => handleFunctionFieldChange(idx, 'contactNumber', e.target.value)}
                            placeholder="e.g. 9169659965"
                          />
                        </div>
                      </div>

                      <Input
                        label="Special Instructions / Notes"
                        value={fn.notes}
                        onChange={(e) => handleFunctionFieldChange(idx, 'notes', e.target.value)}
                        placeholder="e.g. Requires backdrop setups, stage highlights, standard sound checks..."
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* STEP 5: SELECT SERVICES */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Card className="p-6 space-y-6 bg-[#171125] border-white/5">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white">Step 5: Services Assignment</h3>
                <p className="text-xs text-slate-400 mt-1">Select the operational services from the catalog to assign to this project.</p>
              </div>

              {servicesMaster.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#110b21] rounded-2xl border border-white/5">
                  <p className="font-semibold text-slate-300">No Services Available</p>
                  <p className="text-xs mt-1">Configure Service Masters first in the admin consoles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {servicesMaster.map((svc) => {
                    const isSelected = selectedServiceIds.includes(svc._id);
                    return (
                      <div
                        key={svc._id}
                        onClick={() => toggleServiceSelection(svc._id)}
                        className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 flex flex-col justify-between h-44 hover:shadow-lg ${
                          isSelected
                            ? 'border-brand-light bg-[#1F1835] shadow shadow-brand/10'
                            : 'border-white/5 bg-[#110b21] text-slate-400 hover:border-white/10 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-sm truncate max-w-[170px]">{svc.name}</h4>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-light" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{svc.description || 'No description.'}</p>
                        </div>
                        <div className="border-t border-white/5 pt-2 mt-2 flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500">Base Price:</span>
                          <span className="font-extrabold text-brand-light">₹{svc.basePrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* STEP 6: DYNAMIC SERVICE CONFIGURATION */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {selectedServiceIds.map((serviceId) => {
              const svcMaster = servicesMaster.find(s => s._id === serviceId);
              if (!svcMaster) return null;

              const config = servicesConfig[serviceId] || { quotedPrice: 0, dynamicData: {}, functionIndexes: [], notes: '' };
              const dynamicVal = config.dynamicData || {};

              return (
                <Card key={serviceId} className="p-6 space-y-6 bg-[#171125] border-white/5">
                  <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">{svcMaster.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Configure inputs and map this service to scheduling slots.</p>
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Service Config Master
                    </div>
                  </div>

                  {/* Function Mappings Checkboxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Function Mapping * (Assign to specific events)
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {functions.map((fn, idx) => {
                        const isMapped = (config.functionIndexes || []).includes(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleServiceFunctionMapping(serviceId, idx)}
                            className={`px-4 py-2 rounded-2xl border text-xs font-bold cursor-pointer transition-all duration-200 ${
                              isMapped
                                ? 'bg-brand/10 border-brand-light text-brand-light'
                                : 'bg-[#110b21] border-white/5 text-slate-400 hover:border-white/10'
                            }`}
                          >
                            {fn.name} ({fn.date})
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price overrides and comments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Quoted Price Override (₹)"
                      type="number"
                      value={config.quotedPrice}
                      onChange={(e) => handleServiceFieldChange(serviceId, 'quotedPrice', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 25000"
                    />
                    <Input
                      label="Production Notes for this service"
                      value={config.notes || ''}
                      onChange={(e) => handleServiceFieldChange(serviceId, 'notes', e.target.value)}
                      placeholder="e.g. Deliver 1 wedding trailer and 3 reels in draft quality within 10 days"
                    />
                  </div>

                  {/* Dynamic inputs form builder */}
                  {svcMaster.fields?.length > 0 && (
                    <div className="border-t border-white/5 pt-4 space-y-4">
                      <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Dynamic Metadata parameters</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {svcMaster.fields.map((field) => {
                          const val = dynamicVal[field.name] !== undefined ? dynamicVal[field.name] : (field.defaultValue || '');
                          
                          // TEXT FIELD TYPE
                          if (field.type === 'Text') {
                            return (
                              <Input
                                key={field.name}
                                label={field.label + (field.required ? ' *' : '')}
                                value={val}
                                onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                              />
                            );
                          }

                          // NUMBER FIELD TYPE
                          if (field.type === 'Number') {
                            return (
                              <Input
                                key={field.name}
                                label={field.label + (field.required ? ' *' : '')}
                                type="number"
                                value={val}
                                onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, parseFloat(e.target.value) || '')}
                                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                              />
                            );
                          }

                          // SELECT / DROPDOWN TYPE
                          if (field.type === 'Dropdown') {
                            const opts = (field.validation?.options || []).map(o => ({ value: o, label: o }));
                            return (
                              <Select
                                key={field.name}
                                label={field.label + (field.required ? ' *' : '')}
                                value={val}
                                onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                                options={[{ value: '', label: 'Select option...' }, ...opts]}
                              />
                            );
                          }

                          // TOGGLE SWITCH TYPE
                          if (field.type === 'Switch') {
                            return (
                              <div key={field.name} className="flex items-center h-full pt-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!val}
                                    onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.checked)}
                                    className="rounded bg-[#110b21] border-white/10 text-brand-light focus:ring-0 w-4.5 h-4.5"
                                  />
                                  <span className="text-xs font-semibold text-slate-300">{field.label}</span>
                                </label>
                              </div>
                            );
                          }

                          // TEXTAREA
                          if (field.type === 'Textarea') {
                            return (
                              <div key={field.name} className="space-y-1.5 w-full md:col-span-2">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                  {field.label + (field.required ? ' *' : '')}
                                </label>
                                <textarea
                                  value={val}
                                  onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                                  placeholder={field.placeholder || 'Enter notes...'}
                                  className="w-full bg-[#110b21] border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-brand-light h-20 resize-none"
                                />
                              </div>
                            );
                          }

                          // FALLBACK DEFAULT TEXT FIELD
                          return (
                            <Input
                              key={field.name}
                              label={field.label + (field.required ? ' *' : '')}
                              value={val}
                              onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                              placeholder={field.placeholder || `Enter value...`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* STEP 7: SUMMARY REVIEW */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Split layout: operational details, summary tallies */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Project Operations Details */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section A: Customer Account Summary */}
                <Card className="p-6 space-y-4 bg-[#171125] border-white/5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Client Details</h3>
                  {customerMode === 'select' ? (
                    (() => {
                      const client = customers.find(c => c._id === selectedCustomerId);
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <p><span className="text-slate-400">Client Name:</span> <strong className="text-white">{client?.name}</strong></p>
                          <p><span className="text-slate-400">Phone Number:</span> <strong className="text-brand-light">{client?.phone}</strong></p>
                          {client?.email && <p><span className="text-slate-400">Email Address:</span> <strong className="text-slate-200">{client.email}</strong></p>}
                          {client?.companyName && <p><span className="text-slate-400">Company:</span> <strong className="text-slate-200">{client.companyName}</strong></p>}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <p><span className="text-slate-400">Client Name:</span> <strong className="text-white">{newCustName} (New)</strong></p>
                      <p><span className="text-slate-400">Phone Number:</span> <strong className="text-brand-light">{newCustPhone}</strong></p>
                      {newCustEmail && <p><span className="text-slate-400">Email:</span> <strong className="text-slate-200">{newCustEmail}</strong></p>}
                      <p><span className="text-slate-400">Address:</span> <strong className="text-slate-200">{newCustAddress}, {newCustCity}</strong></p>
                    </div>
                  )}
                </Card>

                {/* Section B: Timelines Sequence */}
                <Card className="p-6 space-y-4 bg-[#171125] border-white/5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Timeline Schedule Planner</h3>
                  
                  {/* Timeline Cards */}
                  <div className="relative border-l-2 border-brand-light/30 ml-4 pl-6 space-y-6">
                    {functions.map((fn, idx) => (
                      <div key={idx} className="relative bg-[#110b21] p-4 rounded-2xl border border-white/5">
                        {/* Dot indicator */}
                        <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-brand border-4 border-[#171125]" />
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-sm">{fn.name}</h4>
                            <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{new Date(fn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                              <span className="text-slate-500">&bull;</span>
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{fn.startTime} to {fn.endTime}</span>
                            </p>
                          </div>
                          {fn.venue && (
                            <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand-light px-2.5 py-1 rounded-full flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{fn.venue}</span>
                            </span>
                          )}
                        </div>
                        {fn.notes && <p className="text-xs text-slate-400 mt-2 font-medium bg-white/[0.01] p-2 rounded-lg border border-white/5">{fn.notes}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column: Pricing & services summary */}
              <div className="space-y-6">
                <Card className="p-6 bg-[#171125] border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Assigned Services</h3>
                  
                  <div className="space-y-3.5">
                    {selectedServiceIds.map((id) => {
                      const svc = servicesMaster.find(s => s._id === id);
                      const config = servicesConfig[id] || {};
                      
                      return (
                        <div key={id} className="p-3 bg-[#110b21] rounded-2xl border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{svc?.name}</p>
                            <p className="text-slate-400 mt-0.5">Mapped to {config.functionIndexes?.length || 0} functions</p>
                          </div>
                          <span className="font-extrabold text-brand-light">₹{config.quotedPrice?.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-white">Quoted Booking Total:</span>
                    <span className="text-xl font-black text-brand-light">₹{calculateTotalBookingPrice().toLocaleString('en-IN')}</span>
                  </div>
                </Card>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* STEPPING CONTROLLERS NAVIGATION */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        {currentStep > 1 ? (
          <Button type="button" onClick={handlePrev} variant="glass" className="rounded-xl flex items-center space-x-1.5">
            <ChevronLeft className="w-4.5 h-4.5" />
            <span>Previous Step</span>
          </Button>
        ) : (
          <div />
        )}

        {currentStep < STEPS.length ? (
          <Button type="button" onClick={handleNext} className="rounded-xl flex items-center space-x-1.5">
            <span>Next Step</span>
            <ChevronRight className="w-4.5 h-4.5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleFinalSubmit}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-600 hover:from-emerald-500 hover:to-teal-500 hover:border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/15"
            loading={createBookingMutation.isLoading}
          >
            Confirm & Create Booking
          </Button>
        )}
      </div>
    </div>
  );
};

export default BookingWizard;

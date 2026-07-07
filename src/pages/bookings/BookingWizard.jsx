import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCustomers, createCustomer } from '../../api/customer.api';
import { getServices } from '../../api/service.api';
import { createBooking } from '../../api/booking.api';
import { createInvoice } from '../../api/invoice.api';
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
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Percent,
  Check
} from 'lucide-react';

const AUTOSAVE_KEY = 'rk_single_booking_draft';

// Standard wedding functions helper configurations
const STANDARD_FUNCTIONS_PRESETS = [
  { name: 'Mehndi', offsetDays: -1, startTime: '14:00', endTime: '18:00' },
  { name: 'Haldi', offsetDays: 0, startTime: '10:00', endTime: '13:00' },
  { name: 'Sangeet', offsetDays: 0, startTime: '18:00', endTime: '22:00' },
  { name: 'Baraat', offsetDays: 0, startTime: '16:00', endTime: '19:00' },
  { name: 'Wedding Ceremony', offsetDays: 0, startTime: '19:00', endTime: '23:30' },
  { name: 'Reception', offsetDays: 1, startTime: '19:00', endTime: '23:00' },
  { name: 'Griha Pravesh', offsetDays: 2, startTime: '09:00', endTime: '11:00' }
];

const BookingWizard = () => {
  const navigate = useNavigate();

  // STATE 1: Customer Profile
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

  // STATE 2: Booking Core Details
  const [bookingName, setBookingName] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // STATE 3: Timeline Functions list
  const [functions, setFunctions] = useState([]);

  // STATE 4: Selected Services & Dynamic Data
  // Format: { [serviceId]: { quotedPrice: Number, dynamicData: { key: value }, functionIndexes: [Number], notes: String } }
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [servicesConfig, setServicesConfig] = useState({});

  // STATE 5: Billing & Invoicing Options
  const [generateInvoiceImmediately, setGenerateInvoiceImmediately] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [taxType, setTaxType] = useState('None'); // 'GST', 'IGST', 'None'

  // Fetch directories
  const { data: customerData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomers({ page: 1, limit: 100 })
  });
  const customers = customerData?.data?.customers || [];

  const { data: serviceMasterData } = useQuery({
    queryKey: ['services-master-list'],
    queryFn: () => getServices({ page: 1, limit: 100, activeOnly: true })
  });
  const servicesMaster = serviceMasterData?.data?.services || [];

  // Autosave Loader
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
        if (draft.functions) setFunctions(draft.functions);
        if (draft.selectedServiceIds) setSelectedServiceIds(draft.selectedServiceIds);
        if (draft.servicesConfig) setServicesConfig(draft.servicesConfig);
        if (draft.generateInvoiceImmediately !== undefined) setGenerateInvoiceImmediately(draft.generateInvoiceImmediately);
        if (draft.discount !== undefined) setDiscount(draft.discount);
        if (draft.taxType) setTaxType(draft.taxType);
      } catch (err) {
        console.warn('Failed to parse autosave draft:', err.message);
      }
    }
  }, []);

  // Autosave Saver triggered on input changes
  useEffect(() => {
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
      functions,
      selectedServiceIds,
      servicesConfig,
      generateInvoiceImmediately,
      discount,
      taxType
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  }, [
    customerMode, selectedCustomerId, newCustName, newCustPhone, newCustAltPhone, newCustEmail,
    newCustAddress, newCustCity, newCustState, newCustPincode, bookingName, eventType, startDate,
    endDate, bookingNotes, functions, selectedServiceIds, servicesConfig, generateInvoiceImmediately,
    discount, taxType
  ]);

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
  };

  // Timeline Quick-Toggle Handlers
  const handleToggleFunctionPreset = (preset) => {
    const exists = functions.some(f => f.name === preset.name);
    if (exists) {
      setFunctions(functions.filter(f => f.name !== preset.name));
      // Re-map service function indexes to prevent out of bounds
      toast.success(`Removed ceremony: ${preset.name}`);
    } else {
      let targetDate = startDate || new Date().toISOString().split('T')[0];
      if (startDate) {
        const calculated = new Date(startDate);
        calculated.setDate(calculated.getDate() + preset.offsetDays);
        targetDate = calculated.toISOString().split('T')[0];
      }

      const newFuncObj = {
        name: preset.name,
        date: targetDate,
        startTime: preset.startTime,
        endTime: preset.endTime,
        venue: '',
        address: '',
        contactPerson: '',
        contactNumber: '',
        specialInstructions: '',
        notes: ''
      };
      setFunctions([...functions, newFuncObj]);
      toast.success(`Added ceremony schedule for: ${preset.name}`);
    }
  };

  const addCustomFunction = () => {
    const newFuncObj = {
      name: 'Custom Event',
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
    setFunctions([...functions, newFuncObj]);
  };

  const deleteFunction = (index) => {
    setFunctions(functions.filter((_, idx) => idx !== index));
    
    // Adjust indices mapping inside services
    const copy = { ...servicesConfig };
    Object.keys(copy).forEach(id => {
      if (copy[id].functionIndexes) {
        copy[id].functionIndexes = copy[id].functionIndexes
          .filter(idx => idx !== index)
          .map(idx => (idx > index ? idx - 1 : idx));
      }
    });
    setServicesConfig(copy);
  };

  const handleFunctionFieldChange = (index, field, value) => {
    const updated = [...functions];
    updated[index][field] = value;
    setFunctions(updated);
  };

  // Services Selectors
  const toggleServiceSelection = (serviceId) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    let updatedIds;
    const copy = { ...servicesConfig };

    if (isSelected) {
      updatedIds = selectedServiceIds.filter(id => id !== serviceId);
      delete copy[serviceId];
    } else {
      updatedIds = [...selectedServiceIds, serviceId];
      const master = servicesMaster.find(s => s._id === serviceId);
      
      // Initialize dynamic defaults based on master fields snapshot
      const dynamicDefaults = {};
      master?.fields?.forEach(f => {
        dynamicDefaults[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
      });

      copy[serviceId] = {
        quotedPrice: master?.basePrice || 0,
        dynamicData: dynamicDefaults,
        functionIndexes: [0], // Default map to first event function
        notes: ''
      };
    }

    setSelectedServiceIds(updatedIds);
    setServicesConfig(copy);
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
    const mappings = copy[serviceId].functionIndexes || [];
    if (mappings.includes(funcIdx)) {
      copy[serviceId].functionIndexes = mappings.filter(idx => idx !== funcIdx);
    } else {
      copy[serviceId].functionIndexes = [...mappings, funcIdx];
    }
    setServicesConfig(copy);
  };

  // Calculations details
  const getSubtotal = () => {
    return selectedServiceIds.reduce((sum, id) => {
      return sum + (parseFloat(servicesConfig[id]?.quotedPrice) || 0);
    }, 0);
  };

  const getTaxableAmount = () => {
    return Math.max(0, getSubtotal() - discount);
  };

  const getTaxAmount = () => {
    if (taxType === 'GST') {
      return getTaxableAmount() * 0.18; // 18% GST (9% CGST + 9% SGST)
    } else if (taxType === 'IGST') {
      return getTaxableAmount() * 0.18; // 18% IGST
    }
    return 0;
  };

  const getGrandTotal = () => {
    return getTaxableAmount() + getTaxAmount();
  };

  // Save Mutations
  const createCustomerMutation = useMutation({
    mutationFn: createCustomer
  });

  const createBookingMutation = useMutation({
    mutationFn: createBooking
  });

  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice
  });

  const handleSave = async (e) => {
    e.preventDefault();

    // Validations
    if (customerMode === 'select' && !selectedCustomerId) {
      toast.error('Please select a customer profile');
      return;
    }
    if (customerMode === 'create' && (!newCustName.trim() || !newCustPhone.trim())) {
      toast.error('Customer Name and Phone Number are required');
      return;
    }
    if (!bookingName.trim() || !startDate || !endDate) {
      toast.error('Booking Name, Start Date, and End Date are required');
      return;
    }
    if (functions.length === 0) {
      toast.error('Please configure at least one wedding function (e.g. Wedding Ceremony, Haldi)');
      return;
    }
    if (selectedServiceIds.length === 0) {
      toast.error('Please select at least one photography/album service');
      return;
    }

    // Verify required dynamic service inputs
    for (const id of selectedServiceIds) {
      const config = servicesConfig[id];
      const master = servicesMaster.find(s => s._id === id);
      if (!master) continue;

      if (!config.functionIndexes || config.functionIndexes.length === 0) {
        toast.error(`Please assign service "${master.name}" to at least one timeline event`);
        return;
      }

      for (const field of master.fields || []) {
        if (field.required && (config.dynamicData?.[field.name] === undefined || config.dynamicData?.[field.name] === '')) {
          toast.error(`Field "${field.label}" is required for service "${master.name}"`);
          return;
        }
      }
    }

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
        toast.success(`Registered new customer: ${newCustName}`);
      }

      // 2. Format Services Payload
      const formattedServices = selectedServiceIds.map(id => {
        const config = servicesConfig[id];
        return {
          serviceId: id,
          quotedPrice: config.quotedPrice,
          functionIndexes: config.functionIndexes || [],
          dynamicData: config.dynamicData || {},
          notes: config.notes || ''
        };
      });

      // 3. Create Booking
      const bookingRes = await createBookingMutation.mutateAsync({
        customer: finalCustomerId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes: bookingNotes,
        functions,
        services: formattedServices
      });

      const newBooking = bookingRes.data.booking;
      toast.success(`Booking ${newBooking.bookingNumber} successfully created!`);

      // 4. Create Invoice (if checked)
      if (generateInvoiceImmediately) {
        const invoiceDueDate = new Date(startDate);
        // Default due date to event start date
        
        const invoicePayload = {
          dueDate: invoiceDueDate.toISOString(),
          booking: newBooking._id,
          discount: parseFloat(discount) || 0,
          notes: 'Auto-generated invoice from Booking Wizard'
        };

        if (taxType === 'GST') {
          invoicePayload.taxConfig = {
            taxType: 'GST',
            cgstRate: 9,
            sgstRate: 9
          };
        } else if (taxType === 'IGST') {
          invoicePayload.taxConfig = {
            taxType: 'IGST',
            igstRate: 18
          };
        } else {
          invoicePayload.taxConfig = {
            taxType: 'None'
          };
        }

        const invoiceRes = await createInvoiceMutation.mutateAsync(invoicePayload);
        toast.success(`Invoice ${invoiceRes.data.invoiceNumber} successfully compiled!`);
      }

      clearDraft();
      navigate('/bookings');

    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred during workflow commits');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Single-Page Studio Creator</h2>
        <p className="text-slate-400 text-sm mt-1">
          Create client bookings, timeline ceremonies, deliverable specifications, and invoices in one step.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Client profile, details, timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Customer Profile */}
          <Card className="p-6 space-y-6 bg-[#171125] border border-white/5 rounded-3xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4.5 h-4.5 text-brand-light" />
                1. Customer Account Profile
              </h3>
              
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
                  Select Existing
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
                  Create New
                </button>
              </div>
            </div>

            {customerMode === 'select' ? (
              <Select
                label="Choose Customer Account"
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find(c => c._id === e.target.value);
                  if (cust && !bookingName) {
                    setBookingName(`${cust.name}'s Wedding Event`);
                  }
                }}
                options={[
                  { value: '', label: 'Select client profile...' },
                  ...customers.map(c => ({ value: c._id, label: `${c.name} (${c.phone})` }))
                ]}
              />
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

          {/* Card 2: Booking Core Details */}
          <Card className="p-6 space-y-6 bg-[#171125] border border-white/5 rounded-3xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-white/5 pb-4 flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-brand-light" />
              2. Booking Project Metadata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Booking Project Name *"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                placeholder="e.g. Shivam & Ruchi Wedding Shoot"
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

            <Input
              label="General Project Notes"
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="e.g. Client requested matte finishes and custom drone footage edits."
            />
          </Card>

          {/* Card 3: Wedding Timeline & Events scheduler */}
          <Card className="p-6 space-y-6 bg-[#171125] border border-white/5 rounded-3xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-brand-light" />
                  3. Wedding Timeline & Events
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Toggle ceremonies to add scheduling slots with dates & times.</p>
              </div>
              <Button type="button" onClick={addCustomFunction} variant="glass" size="sm" className="rounded-xl flex items-center space-x-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Event</span>
              </Button>
            </div>

            {/* Quick Toggle Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quick-Add Timeline Ceremonies</label>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_FUNCTIONS_PRESETS.map((preset) => {
                  const isActive = functions.some(f => f.name === preset.name);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleToggleFunctionPreset(preset)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-brand/10 border-brand-light text-brand-light'
                          : 'bg-[#110b21] border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Timeline Slots List */}
            {functions.length > 0 ? (
              <div className="space-y-4 pt-2">
                {functions.map((fn, idx) => (
                  <div
                    key={idx}
                    className="border border-white/5 rounded-2xl p-4 bg-[#110b21] relative space-y-3 shadow-lg shadow-black/10"
                  >
                    <button
                      type="button"
                      onClick={() => deleteFunction(idx)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-2 text-xs font-black text-brand-light uppercase tracking-wider">
                      <span>Timeline Ceremony #{idx + 1}: {fn.name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Ceremony Name"
                        value={fn.name}
                        onChange={(e) => handleFunctionFieldChange(idx, 'name', e.target.value)}
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
                          placeholder="10:00"
                        />
                        <Input
                          label="End Time"
                          value={fn.endTime}
                          onChange={(e) => handleFunctionFieldChange(idx, 'endTime', e.target.value)}
                          placeholder="14:00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Venue Name"
                        value={fn.venue}
                        onChange={(e) => handleFunctionFieldChange(idx, 'venue', e.target.value)}
                        placeholder="e.g. Rajgarh Palace Hall"
                      />
                      <Input
                        label="Venue Address"
                        value={fn.address}
                        onChange={(e) => handleFunctionFieldChange(idx, 'address', e.target.value)}
                        placeholder="e.g. Civil Lines, Jhansi"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-4 text-center bg-[#110b21] rounded-2xl border border-white/5">
                No ceremony timelines defined. Toggle quick-add buttons above.
              </p>
            )}
          </Card>
        </div>

        {/* Right Side: Services Configuration & Billing */}
        <div className="space-y-6">
          
          {/* Card 4: Services Selection & Configuration */}
          <Card className="p-6 space-y-6 bg-[#171125] border border-white/5 rounded-3xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-white/5 pb-4 flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-brand-light" />
              4. Photography Deliverables
            </h3>

            {/* Selectable Services checkboxes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Deliverables Packages Selection</label>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {servicesMaster.map((svc) => {
                  const isSelected = selectedServiceIds.includes(svc._id);
                  return (
                    <div
                      key={svc._id}
                      onClick={() => toggleServiceSelection(svc._id)}
                      className={`p-3 rounded-2xl cursor-pointer border flex justify-between items-center transition-all ${
                        isSelected
                          ? 'border-brand-light bg-[#1F1835] text-brand-light'
                          : 'border-white/5 bg-[#110b21] hover:border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{svc.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Base Price: ₹{svc.basePrice.toLocaleString('en-IN')}</p>
                      </div>
                      {isSelected && <Check className="w-4.5 h-4.5 text-brand-light" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inline Dynamic Form configs */}
            {selectedServiceIds.length > 0 ? (
              <div className="space-y-5 border-t border-white/5 pt-4">
                {selectedServiceIds.map((serviceId) => {
                  const master = servicesMaster.find(s => s._id === serviceId);
                  if (!master) return null;

                  const config = servicesConfig[serviceId] || { quotedPrice: 0, dynamicData: {}, functionIndexes: [], notes: '' };
                  const dynamicVal = config.dynamicData || {};

                  return (
                    <div key={serviceId} className="p-4 bg-[#110b21] rounded-2xl border border-white/5 space-y-4 shadow-lg shadow-black/10">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-black text-white">{master.name}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">Specs & Mappings</span>
                      </div>

                      {/* Mapped ceremonies */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Ceremonies *</label>
                        {functions.length === 0 ? (
                          <p className="text-[10px] text-rose-400 italic">Configure timeline ceremonies first to link service</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {functions.map((fn, idx) => {
                              const isMapped = (config.functionIndexes || []).includes(idx);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => toggleServiceFunctionMapping(serviceId, idx)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                    isMapped
                                      ? 'bg-brand/10 border-brand-light text-brand-light'
                                      : 'bg-[#171125] border-white/5 text-slate-500 hover:text-slate-400'
                                  }`}
                                >
                                  {fn.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quoted pricing override */}
                      <Input
                        label="Quoted Package Price (₹) *"
                        type="number"
                        value={config.quotedPrice}
                        onChange={(e) => handleServiceFieldChange(serviceId, 'quotedPrice', parseFloat(e.target.value) || 0)}
                        className="py-2 text-xs"
                      />

                      {/* Dynamic form generator */}
                      {master.fields?.map((field) => {
                        const val = dynamicVal[field.name] !== undefined ? dynamicVal[field.name] : (field.defaultValue || '');
                        
                        if (field.type === 'Dropdown') {
                          const opts = (field.validation?.options || []).map(o => ({ value: o, label: o }));
                          return (
                            <Select
                              key={field.name}
                              label={field.label + (field.required ? ' *' : '')}
                              value={val}
                              onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                              options={[{ value: '', label: 'Select spec...' }, ...opts]}
                              className="py-2 text-xs"
                            />
                          );
                        }

                        if (field.type === 'Number') {
                          return (
                            <Input
                              key={field.name}
                              label={field.label + (field.required ? ' *' : '')}
                              type="number"
                              value={val}
                              onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, parseFloat(e.target.value) || '')}
                              className="py-2 text-xs"
                            />
                          );
                        }

                        if (field.type === 'Switch') {
                          return (
                            <div key={field.name} className="flex items-center space-x-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={val === true || val === 'true'}
                                onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.checked)}
                                className="rounded bg-[#171125] border-white/10 text-brand w-4 h-4 focus:ring-0"
                              />
                              <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
                            </div>
                          );
                        }

                        return (
                          <Input
                            key={field.name}
                            label={field.label + (field.required ? ' *' : '')}
                            value={val}
                            onChange={(e) => handleServiceFieldChange(serviceId, `dynamicData.${field.name}`, e.target.value)}
                            className="py-2 text-xs"
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-4 bg-[#110b21] rounded-2xl border border-white/5">
                No deliverables selected. Check options above.
              </p>
            )}
          </Card>

          {/* Card 5: Invoice Billing details */}
          <Card className="p-6 space-y-6 bg-[#171125] border border-white/5 rounded-3xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-white/5 pb-4 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-brand-light" />
              5. Invoice Checkout
            </h3>

            {/* Checkbox trigger immediate invoice */}
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                checked={generateInvoiceImmediately}
                onChange={(e) => setGenerateInvoiceImmediately(e.target.checked)}
                className="rounded bg-[#110b21] border-white/10 text-brand w-4.5 h-4.5 focus:ring-0"
              />
              <span className="text-xs font-bold text-slate-200">Compile Invoice immediately upon save</span>
            </div>

            {generateInvoiceImmediately && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
                <Select
                  label="Tax Rule Settings"
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  options={[
                    { value: 'None', label: 'None (No Taxes)' },
                    { value: 'GST', label: 'GST (18% Total: 9% CGST + 9% SGST)' },
                    { value: 'IGST', label: 'IGST (18% Flat)' }
                  ]}
                />
                <Input
                  label="Discount Value Applied (₹)"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  icon={Percent}
                />
              </div>
            )}

            {/* Totals Summary Panel */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal (Quotes Sum):</span>
                <span className="text-white font-bold">₹{getSubtotal().toLocaleString('en-IN')}</span>
              </div>
              
              {generateInvoiceImmediately && (
                <>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Discount Applied:</span>
                    <span className="text-rose-400 font-bold">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                  {taxType !== 'None' && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Taxes ({taxType}):</span>
                      <span className="text-white font-bold">₹{getTaxAmount().toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1.5">
                <span className="text-xs font-bold text-white">Grand Total:</span>
                <span className="text-xl font-black text-brand-light">₹{getGrandTotal().toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              type="submit"
              className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-600 hover:from-emerald-500 hover:to-teal-500 hover:border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
              loading={createCustomerMutation.isLoading || createBookingMutation.isLoading || createInvoiceMutation.isLoading}
            >
              Confirm & Save Wedding Booking
            </Button>
          </Card>
        </div>

      </form>
    </div>
  );
};

export default BookingWizard;

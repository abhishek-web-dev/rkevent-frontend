import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCustomers } from '../../api/customer.api';
import { createInvoice } from '../../api/invoice.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Calendar,
  IndianRupee,
  Briefcase,
  Layers,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

// Preset Services matching Indian Event Business
const PRESET_SERVICES_LIST = [
  'Wedding Photography',
  'Pre Wedding Shoot',
  'Cinematic Video',
  'Traditional Video',
  'Ring Ceremony Photography',
  'Birthday Photography',
  'Drone Shoot',
  'Album',
  'Stage Decoration',
  'Home Decoration',
  'Birthday Decoration',
  'Bride Entry',
  'Flower Decoration',
  'Full Event Planner',
  'DJ',
  'Sound System',
  'LED Screen',
  'Catering',
  'Makeup Artist',
  'Car Decoration'
];

// Flattened validation schema
const bookingFormSchema = zod.object({
  customerSelectionType: zod.enum(['existing', 'new']),
  customer: zod.string().optional(),
  customerName: zod.string().optional(),
  customerPhone: zod.string().optional(),
  customerAlternatePhone: zod.string().optional(),
  customerEmail: zod.string().optional(),
  customerAddress: zod.string().optional(),
  customerCity: zod.string().optional(),
  customerState: zod.string().optional(),
  customerPincode: zod.string().optional(),
  saveCustomer: zod.boolean().default(true),

  eventType: zod.string().min(1, 'Event type is required'),
  customEventType: zod.string().optional(),
  eventDate: zod.string().min(1, 'Event date is required'),
  eventTime: zod.string().optional(),
  eventLocation: zod.string().min(1, 'Event location is required'),
  specialRequirements: zod.string().optional(),

  functions: zod.array(
    zod.object({
      name: zod.string().min(1, 'Ceremony name is required'),
      date: zod.string().min(1, 'Date is required'),
      startTime: zod.string().optional(),
      endTime: zod.string().optional(),
      venue: zod.string().optional()
    })
  ).optional().default([]),
  
  items: zod.array(
    zod.object({
      serviceName: zod.string().min(1, 'Service name is required'),
      category: zod.string().optional().default(''),
      description: zod.string().optional(),
      quantity: zod.coerce.number().min(1, 'Quantity must be at least 1'),
      price: zod.coerce.number().min(0, 'Price must be positive'),
      specs: zod.record(zod.any()).optional(),
    })
  ).min(1, 'Add at least one service row'),
  
  discount: zod.coerce.number().min(0).default(0),
  tokenAmount: zod.coerce.number().min(0).default(0),
  paymentMode: zod.string().min(1, 'Payment mode is required'),
}).superRefine((data, ctx) => {
  if (data.customerSelectionType === 'existing' && !data.customer) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'Please select an existing customer',
      path: ['customer'],
    });
  }
  if (data.customerSelectionType === 'new') {
    if (!data.customerName || data.customerName.trim() === '') {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: 'Customer name is required',
        path: ['customerName'],
      });
    }
    if (!data.customerPhone || data.customerPhone.trim() === '') {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: 'Phone number is required',
        path: ['customerPhone'],
      });
    }
  }
  if (data.eventType === 'Other' && (!data.customEventType || data.customEventType.trim() === '')) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'Custom event type is required',
      path: ['customEventType'],
    });
  }
});

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Fetch active customers
  const { data: customerRes, isLoading: customersLoading } = useQuery({
    queryKey: ['activeCustomersForInvoice'],
    queryFn: () => getCustomers({ page: 1, limit: 100 }),
  });

  const customers = customerRes?.data?.customers || [];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerSelectionType: 'new',
      customer: '',
      customerName: '',
      customerPhone: '',
      customerAlternatePhone: '',
      customerEmail: '',
      customerAddress: '',
      customerCity: 'Jhansi',
      customerState: 'Uttar Pradesh',
      customerPincode: '',
      saveCustomer: true,
      
      eventType: '',
      customEventType: '',
      eventDate: new Date().toISOString().substring(0, 10),
      eventTime: '18:00',
      eventLocation: '',
      specialRequirements: '',
      functions: [],
      
      items: [{ serviceName: '', category: '', description: '', quantity: 1, price: 0 }],
      discount: 0,
      tokenAmount: 0,
      paymentMode: 'UPI',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const { fields: functionFields, append: appendFunction, remove: removeFunction } = useFieldArray({
    control,
    name: 'functions',
  });

  // Watch form fields
  const watchedSelectionType = watch('customerSelectionType');
  const watchedCustomerId = watch('customer');
  const watchedItems = watch('items') || [];
  const watchedDiscount = watch('discount') || 0;
  const watchedTokenAmount = watch('tokenAmount') || 0;
  const watchedEventType = watch('eventType');
  const watchedCustomEventType = watch('customEventType');
  const watchedFunctions = watch('functions') || [];

  // Photography event check to hide guest counts
  const shouldShowGuestCount = (type) => {
    if (!type) return true;
    const t = type.toLowerCase();
    return !(
      t.includes('photography') ||
      t.includes('shoot') ||
      t.includes('drone') ||
      t.includes('album') ||
      t === 'pre wedding' ||
      t === 'pre-wedding'
    );
  };

  const resolvedEventTypeForGuestCheck = watchedEventType === 'Other' ? watchedCustomEventType : watchedEventType;
  const showGuestCount = shouldShowGuestCount(resolvedEventTypeForGuestCheck);

  // Real-time calculations
  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + qty * price;
  }, 0);

  const totalAmount = Math.max(0, subtotal - parseFloat(watchedDiscount || '0'));
  const remainingAmount = Math.max(0, totalAmount - parseFloat(watchedTokenAmount || '0'));

  // Multi-step validation guards
  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger([
        'customerSelectionType',
        'customer',
        'customerName',
        'customerPhone',
        'customerAlternatePhone',
        'customerEmail',
        'customerAddress',
        'customerCity',
        'customerState',
        'customerPincode',
      ]);
    } else if (step === 2) {
      isValid = await trigger([
        'eventType',
        'customEventType',
        'eventDate',
        'eventTime',
        'eventLocation',
        'specialRequirements',
        'functions',
      ]);
    } else if (step === 3) {
      isValid = await trigger(['items']);
    } else if (step === 4) {
      isValid = await trigger(['discount', 'tokenAmount', 'paymentMode']);
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    } else {
      toast.error('Please fix validation errors before moving forward');
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Create invoice mutation
  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success('Event Booking Invoice created successfully!');
      navigate('/invoices');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    },
  });

  const onSubmit = (data) => {
    const finalEventType = data.eventType === 'Other' ? data.customEventType : data.eventType;

    const apiPayload = {
      dueDate: data.eventDate, // defaults due date to event date
      eventType: finalEventType,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      expectedGuestCount: 0,
      specialRequirements: data.specialRequirements,
      functions: data.functions || [],
      items: data.items.map(item => ({
        serviceName: item.serviceName,
        category: item.category || '',
        description: item.description || '',
        quantity: item.quantity,
        price: item.price,
        specs: item.specs
      })),
      discount: data.discount,
      tokenAmount: data.tokenAmount,
      paymentMode: data.paymentMode,
    };

    if (data.customerSelectionType === 'existing') {
      apiPayload.customer = data.customer;
    } else {
      apiPayload.customerDetails = {
        name: data.customerName,
        phone: data.customerPhone,
        alternatePhone: data.customerAlternatePhone || undefined,
        email: data.customerEmail || undefined,
        address: data.customerAddress || undefined,
        city: data.customerCity || undefined,
        state: data.customerState || undefined,
        pincode: data.customerPincode || undefined,
        saveCustomer: data.saveCustomer,
      };
    }

    mutation.mutate(apiPayload);
  };

  // Sync details if selecting existing customer
  const handleExistingCustomerSelect = (id) => {
    const selected = customers.find((c) => c._id === id);
    if (selected) {
      setValue('customerName', selected.name);
      setValue('customerPhone', selected.phone);
      setValue('customerAlternatePhone', selected.alternatePhone || '');
      setValue('customerEmail', selected.email || '');
      setValue('customerAddress', selected.address || '');
      setValue('customerCity', selected.city || 'Jhansi');
      setValue('customerState', selected.state || 'Uttar Pradesh');
      setValue('customerPincode', selected.pincode || '');
    }
  };

  // Sync category presets
  const handlePresetSelect = (index, presetName) => {
    const category = watchedItems[index]?.category;
    if (category && PRESET_SERVICES[category]) {
      const selected = PRESET_SERVICES[category].find((p) => p.name === presetName);
      if (selected) {
        setValue(`items.${index}.serviceName`, selected.name);
        setValue(`items.${index}.price`, selected.price);
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const stepperItems = [
    { label: 'Client Details', step: 1 },
    { label: 'Event Details', step: 2 },
    { label: 'Select Services', step: 3 },
    { label: 'Payment Terms', step: 4 },
    { label: 'Verify Booking', step: 5 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-2">
        <Link to="/invoices" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Event Booking ERP</h2>
          <p className="text-slate-400 text-sm mt-1">Generate dynamic invoices and log client reservations.</p>
        </div>
      </div>

      {/* Stepper circles */}
      <div className="flex justify-between items-center bg-[#0a0715]/40 border border-white/5 p-4 rounded-3xl overflow-x-auto">
        {stepperItems.map((item, idx) => (
          <div key={item.step} className="flex items-center space-x-2 shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step > item.step
                  ? 'bg-emerald-500 text-white'
                  : step === item.step
                  ? 'bg-brand-light text-white shadow shadow-brand-light/35 ring-4 ring-brand-light/20'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              {step > item.step ? <Check className="w-4 h-4" /> : item.step}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === item.step ? 'text-brand-light' : 'text-slate-400'
              }`}
            >
              {item.label}
            </span>
            {idx < stepperItems.length - 1 && (
              <div className="h-0.5 w-8 bg-white/5 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Form Wizard Pages */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Customer Details */}
        {step === 1 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <User className="w-5 h-5 text-brand-light" />
                <span>Customer Profile Details</span>
              </h3>
            </div>

            <div className="flex bg-white/5 p-1 rounded-2xl max-w-sm">
              <button
                type="button"
                onClick={() => setValue('customerSelectionType', 'new')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  watchedSelectionType === 'new' ? 'bg-brand-light text-white' : 'text-slate-400'
                }`}
              >
                New Customer
              </button>
              <button
                type="button"
                onClick={() => setValue('customerSelectionType', 'existing')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  watchedSelectionType === 'existing' ? 'bg-brand-light text-white' : 'text-slate-400'
                }`}
              >
                Select Existing
              </button>
            </div>

            {watchedSelectionType === 'existing' && (
              <div className="max-w-md animate-in fade-in duration-200">
                <Select
                  {...register('customer')}
                  label="Select Customer *"
                  onChange={(e) => {
                    setValue('customer', e.target.value);
                    handleExistingCustomerSelect(e.target.value);
                  }}
                  options={[
                    { label: customersLoading ? 'Loading...' : 'Choose customer...', value: '' },
                    ...customers.map((c) => ({
                      label: `${c.name} (${c.phone})`,
                      value: c._id,
                    })),
                  ]}
                  error={errors.customer?.message}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
              <Input
                {...register('customerName')}
                label="Customer Name *"
                placeholder="Rahul Kumar"
                error={errors.customerName?.message}
                disabled={watchedSelectionType === 'existing'}
              />

              <Input
                {...register('customerPhone')}
                label="Phone Number *"
                placeholder="99999 88888"
                error={errors.customerPhone?.message}
                disabled={watchedSelectionType === 'existing'}
              />

              <Input
                {...register('customerAlternatePhone')}
                label="Alternate Phone"
                placeholder="93696 XXXXX"
                error={errors.customerAlternatePhone?.message}
                disabled={watchedSelectionType === 'existing'}
              />

              <Input
                {...register('customerEmail')}
                type="email"
                label="Email Address"
                placeholder="billing@rkevent.com"
                error={errors.customerEmail?.message}
                disabled={watchedSelectionType === 'existing'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-white/5 pt-6 animate-in fade-in duration-200">
              <div className="md:col-span-2">
                <Input
                  {...register('customerAddress')}
                  label="Street Address"
                  placeholder="Civil Lines, Rajgarh"
                  error={errors.customerAddress?.message}
                  disabled={watchedSelectionType === 'existing'}
                />
              </div>
              <Input
                {...register('customerCity')}
                label="City"
                placeholder="Jhansi"
                error={errors.customerCity?.message}
                disabled={watchedSelectionType === 'existing'}
              />
              <Input
                {...register('customerPincode')}
                label="Pincode"
                placeholder="284001"
                error={errors.customerPincode?.message}
                disabled={watchedSelectionType === 'existing'}
              />
            </div>

            {watchedSelectionType === 'new' && (
              <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  {...register('saveCustomer')}
                  className="rounded border-white/10 text-brand-light focus:ring-brand-light bg-white/5"
                />
                <span>Save customer credentials for future bookings</span>
              </label>
            )}
          </Card>
        )}

        {/* Step 2: Event Details */}
        {step === 2 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-brand-light" />
                <span>Event Specifications & Timeline</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
              <Select
                {...register('eventType')}
                label="Event Type *"
                options={[
                  { label: 'Choose event style...', value: '' },
                  { label: 'Wedding', value: 'Wedding' },
                  { label: 'Pre Wedding', value: 'Pre Wedding' },
                  { label: 'Ring Ceremony', value: 'Ring Ceremony' },
                  { label: 'Birthday', value: 'Birthday' },
                  { label: 'Haldi', value: 'Haldi' },
                  { label: 'Engagement', value: 'Engagement' },
                  { label: 'Baby Shower', value: 'Baby Shower' },
                  { label: 'Anniversary', value: 'Anniversary' },
                  { label: 'Corporate Event', value: 'Corporate Event' },
                  { label: 'Other', value: 'Other' },
                ]}
                error={errors.eventType?.message}
              />

              {watchedEventType === 'Other' && (
                <Input
                  {...register('customEventType')}
                  label="Enter Custom Event Type *"
                  placeholder="e.g. Naming Ceremony, Temple Function"
                  error={errors.customEventType?.message}
                />
              )}

              <Input
                {...register('eventDate')}
                type="date"
                label="Event Date *"
                error={errors.eventDate?.message}
              />

              <Input
                {...register('eventTime')}
                type="time"
                label="Event Time"
                error={errors.eventTime?.message}
              />

              <Input
                {...register('eventLocation')}
                label="Event Venue / Location *"
                placeholder="In front of Punjab National Bank, Rajgarh, Jhansi"
                error={errors.eventLocation?.message}
              />
            </div>

            {watchedEventType === 'Wedding' && (
              <div className="space-y-4 border-t border-white/5 pt-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Wedding Timeline Ceremonies
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle standard events to add dates & times slots.</p>
                  </div>
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => appendFunction({ name: 'Custom Ceremony', date: watch('eventDate') || '', startTime: '10:00', endTime: '14:00', venue: watch('eventLocation') || '' })}
                    className="rounded-xl flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom</span>
                  </Button>
                </div>

                {/* Preset Quick Add Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {['Haldi', 'Mehndi', 'Baraat', 'Sangeet', 'Grah Pravesh', 'Reception'].map((name) => {
                    const isAdded = watchedFunctions.some((f) => f.name === name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            const idx = watchedFunctions.findIndex((f) => f.name === name);
                            if (idx !== -1) removeFunction(idx);
                          } else {
                            appendFunction({
                              name,
                              date: watch('eventDate') || '',
                              startTime: '10:00',
                              endTime: '14:00',
                              venue: watch('eventLocation') || '',
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isAdded
                            ? 'bg-brand-light/10 border-brand-light text-brand-light'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>

                {/* Functions rows rendering */}
                {functionFields.length > 0 ? (
                  <div className="space-y-4">
                    {functionFields.map((fn, idx) => (
                      <div
                        key={fn.id}
                        className="border border-white/5 rounded-2xl p-4 bg-white/[0.01] relative space-y-3 shadow-lg shadow-black/10 animate-in slide-in-from-top-1 duration-150"
                      >
                        <button
                          type="button"
                          onClick={() => removeFunction(idx)}
                          className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="text-xs font-black text-brand-light uppercase tracking-wider flex items-center space-x-1">
                          <span>Timeline Ceremony #{idx + 1}: {watch(`functions.${idx}.name`)}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            {...register(`functions.${idx}.name`)}
                            label="Ceremony Name"
                            error={errors.functions?.[idx]?.name?.message}
                          />
                          <Input
                            {...register(`functions.${idx}.date`)}
                            type="date"
                            label="Date *"
                            error={errors.functions?.[idx]?.date?.message}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              {...register(`functions.${idx}.startTime`)}
                              label="Start Time"
                              placeholder="10:00"
                              error={errors.functions?.[idx]?.startTime?.message}
                            />
                            <Input
                              {...register(`functions.${idx}.endTime`)}
                              label="End Time"
                              placeholder="14:00"
                              error={errors.functions?.[idx]?.endTime?.message}
                            />
                          </div>
                        </div>

                        <Input
                          {...register(`functions.${idx}.venue`)}
                          label="Venue Location"
                          placeholder="e.g. Rajgarh Palace Hall"
                          error={errors.functions?.[idx]?.venue?.message}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 text-center bg-white/[0.01] rounded-2xl border border-white/5">
                    No timeline ceremonies added yet. Click preset buttons above or Add Custom.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Client Requirements / Notes
              </label>
              <textarea
                {...register('specialRequirements')}
                rows={3}
                placeholder="e.g. Drone photography at Bride Entry, Sound system setup by 4:00 PM..."
                className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm outline-none placeholder:text-slate-500 resize-none"
              />
            </div>
          </Card>
        )}

        {/* Step 3: Services Dynamic Rows */}
        {step === 3 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-brand-light" />
                <span>Select Services & Packages</span>
              </h3>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => append({ serviceName: '', category: '', description: '', quantity: 1, price: 0 })}
                className="rounded-xl flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const rowTotal = (watchedItems[index]?.quantity || 1) * (watchedItems[index]?.price || 0);

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 rounded-2xl bg-white/[0.01] border border-white/5 animate-in fade-in duration-200"
                  >
                    {/* Service Name Input & Dropdown combo */}
                    <div className="md:col-span-5 space-y-2.5">
                      {(() => {
                        const serviceNameVal = watchedItems[index]?.serviceName || '';
                        const isPreset = PRESET_SERVICES_LIST.includes(serviceNameVal);
                        const selectValue = serviceNameVal === '' ? '' : (isPreset ? serviceNameVal : 'Other');

                        return (
                          <>
                            <Select
                              label={index === 0 ? 'Service Name *' : undefined}
                              value={selectValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Other') {
                                  setValue(`items.${index}.serviceName`, '');
                                } else {
                                  setValue(`items.${index}.serviceName`, val);
                                  if (val.toLowerCase().includes('wedding') || val.toLowerCase().includes('package')) {
                                    setValue(`items.${index}.specs`, {
                                      album: { selected: true, dimensions: '12x36', sheets: 20 },
                                      video: { selected: true, duration: 2, penDriveOption: 'studio_supplied' },
                                      cinematic: { selected: true, duration: 30, reelsCount: 3 },
                                      drone: { selected: true, dronesCount: 1, hours: 4 }
                                    });
                                    setValue(`items.${index}.description`, 'Included: Album (Size: 12x36, Sheets: 20), Video (Duration: 2 Hrs, Pen Drive: We supply), Cinematic Film (Duration: 30 Mins, Reels: 3), Drone Shoot (1 Drone, 4 Hours)');
                                    setValue(`items.${index}.price`, 75000);
                                  } else if (val.toLowerCase().includes('album')) {
                                    setValue(`items.${index}.specs`, { album: { selected: true, dimensions: '12x36', sheets: 20 } });
                                    setValue(`items.${index}.description`, 'Included: Album (Size: 12x36, Sheets: 20)');
                                    setValue(`items.${index}.price`, 15000);
                                  } else if (val.toLowerCase().includes('traditional') || (val.toLowerCase().includes('video') && !val.toLowerCase().includes('cinematic'))) {
                                    setValue(`items.${index}.specs`, { video: { selected: true, duration: 2, penDriveOption: 'studio_supplied' } });
                                    setValue(`items.${index}.description`, 'Included: Video (Duration: 2 Hrs, Pen Drive: We supply)');
                                    setValue(`items.${index}.price`, 20000);
                                  } else if (val.toLowerCase().includes('cinematic')) {
                                    setValue(`items.${index}.specs`, { cinematic: { selected: true, duration: 30, reelsCount: 3 } });
                                    setValue(`items.${index}.description`, 'Included: Cinematic Film (Duration: 30 Mins, Reels: 3)');
                                    setValue(`items.${index}.price`, 35000);
                                  } else if (val.toLowerCase().includes('drone')) {
                                    setValue(`items.${index}.specs`, { drone: { selected: true, dronesCount: 1, hours: 4 } });
                                    setValue(`items.${index}.description`, 'Included: Drone Shoot (1 Drone, 4 Hours)');
                                    setValue(`items.${index}.price`, 10000);
                                  }
                                }
                              }}
                              options={[
                                { value: '', label: 'Preset list...' },
                                ...PRESET_SERVICES_LIST.map((name) => ({ value: name, label: name })),
                                { value: 'Other', label: 'Other (Enter Custom)' }
                              ]}
                              error={errors.items?.[index]?.serviceName ? true : undefined}
                            />
                            {selectValue === 'Other' && (
                              <div className="animate-in slide-in-from-top-1 duration-150">
                                <Input
                                  {...register(`items.${index}.serviceName`)}
                                  placeholder="Enter custom service name"
                                  error={errors.items?.[index]?.serviceName?.message}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <Input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        label={index === 0 ? 'Qty *' : undefined}
                        placeholder="1"
                        error={errors.items?.[index]?.quantity?.message}
                      />
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2">
                      <Input
                        {...register(`items.${index}.price`)}
                        type="number"
                        label={index === 0 ? 'Price (₹) *' : undefined}
                        placeholder="0"
                        error={errors.items?.[index]?.price?.message}
                      />
                    </div>

                    {/* Amount */}
                    <div className="md:col-span-2 flex flex-col justify-end h-full pb-2">
                      {index === 0 && (
                        <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block mb-2">
                          Amount
                        </label>
                      )}
                      <span className="text-sm font-bold text-slate-200 font-sans mt-2">
                        {formatCurrency(rowTotal)}
                      </span>
                    </div>
                    {/* Delete */}
                    <div className="md:col-span-1 flex justify-center pb-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="glass"
                          onClick={() => remove(index)}
                          className="rounded-xl p-2.5 text-rose-450 hover:bg-rose-500/10 hover:border-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Specifications Sub-Form */}
                    {(() => {
                      const serviceName = watchedItems[index]?.serviceName || '';
                      const isWedding = serviceName.toLowerCase().includes('wedding') || serviceName.toLowerCase().includes('package');
                      
                      const isSingleAlbum = !isWedding && serviceName.toLowerCase().includes('album');
                      const isSingleVideo = !isWedding && (serviceName.toLowerCase().includes('traditional') || (serviceName.toLowerCase().includes('video') && !serviceName.toLowerCase().includes('cinematic')));
                      const isSingleCinematic = !isWedding && serviceName.toLowerCase().includes('cinematic');
                      const isSingleDrone = !isWedding && serviceName.toLowerCase().includes('drone');

                      // Determine if specific deliverables are enabled
                      const showAlbumFields = isSingleAlbum || (isWedding && watchedItems[index]?.specs?.album?.selected);
                      const showVideoFields = isSingleVideo || (isWedding && watchedItems[index]?.specs?.video?.selected);
                      const showCinematicFields = isSingleCinematic || (isWedding && watchedItems[index]?.specs?.cinematic?.selected);
                      const showDroneFields = isSingleDrone || (isWedding && watchedItems[index]?.specs?.drone?.selected);

                      if (!isWedding && !isSingleAlbum && !isSingleVideo && !isSingleCinematic && !isSingleDrone) return null;

                      // Synchronize human-readable descriptions for invoice printing
                      const syncDescription = (specsObj) => {
                        let parts = [];
                        if (isSingleAlbum || (specsObj.album && specsObj.album.selected)) {
                          const alb = specsObj.album || specsObj;
                          const dimsVal = alb.dimensions === 'custom' ? (alb.customDimensions || 'Custom') : (alb.dimensions || '12x36');
                          parts.push(`Album (Size: ${dimsVal}, Sheets: ${alb.sheets || 20})`);
                        }
                        if (isSingleVideo || (specsObj.video && specsObj.video.selected)) {
                          const vid = specsObj.video || specsObj;
                          const driveStr = vid.penDriveOption === 'studio_supplied' ? 'We supply' : vid.penDriveOption === 'customer_supplied' ? 'Customer provides' : 'Digital only';
                          parts.push(`Video (Duration: ${vid.duration || 2} Hrs, Pen Drive: ${driveStr})`);
                        }
                        if (isSingleCinematic || (specsObj.cinematic && specsObj.cinematic.selected)) {
                          const cin = specsObj.cinematic || specsObj;
                          parts.push(`Cinematic Film (Duration: ${cin.duration || 30} Mins, Reels: ${cin.reelsCount || 3})`);
                        }
                        if (isSingleDrone || (specsObj.drone && specsObj.drone.selected)) {
                          const drn = specsObj.drone || specsObj;
                          parts.push(`Drone Shoot (${drn.dronesCount || 1} Drone, ${drn.hours || 4} Hours)`);
                        }
                        // Sync custom deliverables
                        if (specsObj.customDeliverables && specsObj.customDeliverables.length > 0) {
                          specsObj.customDeliverables.forEach(c => {
                            if (c.selected) {
                              parts.push(`${c.name} (${c.notes || 'Included'})`);
                            }
                          });
                        }
                        const desc = parts.length > 0 ? `Included: ${parts.join(', ')}` : 'Wedding package coverage';
                        setValue(`items.${index}.description`, desc);
                      };

                      return (
                        <div className="md:col-span-12 space-y-4 p-4 mt-2 bg-white/[0.01] border border-white/5 rounded-2xl animate-in slide-in-from-top-1 duration-150">
                          <div className="text-[10px] font-black text-brand-light uppercase tracking-wider flex items-center justify-between">
                            <span>Configure {serviceName} Deliverables & Options</span>
                          </div>

                          {/* Render Checkboxes if it is a Wedding Package */}
                          {isWedding && (
                            <div className="bg-black/10 p-3 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center pb-1">
                                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                                  Included Deliverables Checklist
                                </label>
                                <Button
                                  type="button"
                                  variant="glass"
                                  size="sm"
                                  onClick={() => {
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const customList = currentSpecs.customDeliverables || [];
                                    const updated = {
                                      ...currentSpecs,
                                      customDeliverables: [
                                        ...customList,
                                        { name: `Custom Service #${customList.length + 1}`, selected: true, notes: '' }
                                      ]
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                  className="rounded-xl py-1 px-2.5 text-[10px] h-auto flex items-center space-x-1 border border-white/10 hover:border-brand-light/30"
                                >
                                  <Plus className="w-3 h-3 text-brand-light" />
                                  <span>Add service</span>
                                </Button>
                              </div>
                              
                              <div className="flex flex-wrap gap-4">
                                <label className="flex items-center space-x-2 text-xs font-medium text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={watchedItems[index]?.specs?.album?.selected === true}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const updated = {
                                        ...currentSpecs,
                                        album: {
                                          ...currentSpecs.album,
                                          selected: e.target.checked,
                                          dimensions: currentSpecs.album?.dimensions || '12x36',
                                          sheets: currentSpecs.album?.sheets || 20
                                        }
                                      };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                    className="rounded bg-slate-900 border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                                  />
                                  <span>Wedding Album</span>
                                </label>

                                <label className="flex items-center space-x-2 text-xs font-medium text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={watchedItems[index]?.specs?.video?.selected === true}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const updated = {
                                        ...currentSpecs,
                                        video: {
                                          ...currentSpecs.video,
                                          selected: e.target.checked,
                                          duration: currentSpecs.video?.duration || 2,
                                          penDriveOption: currentSpecs.video?.penDriveOption || 'studio_supplied'
                                        }
                                      };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                    className="rounded bg-slate-900 border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                                  />
                                  <span>Traditional Video</span>
                                </label>

                                <label className="flex items-center space-x-2 text-xs font-medium text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={watchedItems[index]?.specs?.cinematic?.selected === true}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const updated = {
                                        ...currentSpecs,
                                        cinematic: {
                                          ...currentSpecs.cinematic,
                                          selected: e.target.checked,
                                          duration: currentSpecs.cinematic?.duration || 30,
                                          reelsCount: currentSpecs.cinematic?.reelsCount || 3
                                        }
                                      };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                    className="rounded bg-slate-900 border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                                  />
                                  <span>Cinematic Film</span>
                                </label>

                                <label className="flex items-center space-x-2 text-xs font-medium text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={watchedItems[index]?.specs?.drone?.selected === true}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const updated = {
                                        ...currentSpecs,
                                        drone: {
                                          ...currentSpecs.drone,
                                          selected: e.target.checked,
                                          dronesCount: currentSpecs.drone?.dronesCount || 1,
                                          hours: currentSpecs.drone?.hours || 4
                                        }
                                      };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                    className="rounded bg-slate-900 border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                                  />
                                  <span>Drone Service</span>
                                </label>

                                {/* Custom Deliverables checkboxes */}
                                {(watchedItems[index]?.specs?.customDeliverables || []).map((cust, cIdx) => (
                                  <label key={cIdx} className="flex items-center space-x-2 text-xs font-medium text-slate-200 cursor-pointer animate-in fade-in duration-200">
                                    <input
                                      type="checkbox"
                                      checked={cust.selected === true}
                                      onChange={(e) => {
                                        const currentSpecs = watchedItems[index]?.specs || {};
                                        const customList = [...(currentSpecs.customDeliverables || [])];
                                        customList[cIdx] = { ...customList[cIdx], selected: e.target.checked };
                                        const updated = { ...currentSpecs, customDeliverables: customList };
                                        setValue(`items.${index}.specs`, updated);
                                        syncDescription(updated);
                                      }}
                                      className="rounded bg-slate-900 border-white/10 text-brand-light focus:ring-0 w-4 h-4"
                                    />
                                    <span>{cust.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Specific sub-forms grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Album Fields */}
                            {showAlbumFields && (
                              <div className="border border-white/5 p-4 rounded-xl bg-black/10 space-y-3 animate-in fade-in duration-200">
                                <div className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                                  Album Details
                                </div>
                                <Select
                                  label="Album Size"
                                  value={watchedItems[index]?.specs?.album?.dimensions || '12x36'}
                                  onChange={(e) => {
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      album: { ...currentSpecs.album, dimensions: e.target.value }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                  options={[
                                    { value: '12x36', label: '12x36 Premium' },
                                    { value: '12x30', label: '12x30 Standard' },
                                    { value: '30x40', label: '30x40 Large' },
                                    { value: '15x20', label: '15x20 Portrait' },
                                    { value: 'custom', label: 'Other / Custom Size' }
                                  ]}
                                />
                                {watchedItems[index]?.specs?.album?.dimensions === 'custom' && (
                                  <div className="animate-in slide-in-from-top-1 duration-150">
                                    <Input
                                      label="Custom Album Size"
                                      placeholder="e.g. 10x15, 12x36 Custom"
                                      value={watchedItems[index]?.specs?.album?.customDimensions || ''}
                                      onChange={(e) => {
                                        const currentSpecs = watchedItems[index]?.specs || {};
                                        const updated = {
                                          ...currentSpecs,
                                          album: { ...currentSpecs.album, customDimensions: e.target.value }
                                        };
                                        setValue(`items.${index}.specs`, updated);
                                        syncDescription(updated);
                                      }}
                                    />
                                  </div>
                                )}
                                <Input
                                  label="Number of Sheets"
                                  type="number"
                                  value={watchedItems[index]?.specs?.album?.sheets ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseInt(raw) ?? 0);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      album: { ...currentSpecs.album, sheets: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                              </div>
                            )}

                            {/* Traditional Video Fields */}
                            {showVideoFields && (
                              <div className="border border-white/5 p-4 rounded-xl bg-black/10 space-y-3 animate-in fade-in duration-200">
                                <div className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                                  Traditional Video Details
                                </div>
                                <Input
                                  label="Video Duration (Hours)"
                                  type="number"
                                  value={watchedItems[index]?.specs?.video?.duration ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseFloat(raw) ?? 0);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      video: { ...currentSpecs.video, duration: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                                <Select
                                  label="Pen Drive Source"
                                  value={watchedItems[index]?.specs?.video?.penDriveOption || 'studio_supplied'}
                                  onChange={(e) => {
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      video: { ...currentSpecs.video, penDriveOption: e.target.value }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                  options={[
                                    { value: 'studio_supplied', label: 'Studio Supplies Pen Drive' },
                                    { value: 'customer_supplied', label: 'Customer Provides Pen Drive' },
                                    { value: 'digital_only', label: 'Digital Delivery Only' }
                                  ]}
                                />
                              </div>
                            )}

                            {/* Cinematic Fields */}
                            {showCinematicFields && (
                              <div className="border border-white/5 p-4 rounded-xl bg-black/10 space-y-3 animate-in fade-in duration-200">
                                <div className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                                  Cinematic Details
                                </div>
                                <Input
                                  label="Cinematic Duration (Mins)"
                                  type="number"
                                  value={watchedItems[index]?.specs?.cinematic?.duration ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseInt(raw) ?? 0);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      cinematic: { ...currentSpecs.cinematic, duration: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                                <Input
                                  label="IG Reels Included"
                                  type="number"
                                  value={watchedItems[index]?.specs?.cinematic?.reelsCount ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseInt(raw) ?? 0);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      cinematic: { ...currentSpecs.cinematic, reelsCount: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                              </div>
                            )}

                            {/* Drone Fields */}
                            {showDroneFields && (
                              <div className="border border-white/5 p-4 rounded-xl bg-black/10 space-y-3 animate-in fade-in duration-200">
                                <div className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                                  Drone Shoot Details
                                </div>
                                <Input
                                  label="Number of Drones"
                                  type="number"
                                  value={watchedItems[index]?.specs?.drone?.dronesCount ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseInt(raw) ?? 1);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      drone: { ...currentSpecs.drone, dronesCount: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                                <Input
                                  label="Coverage Hours"
                                  type="number"
                                  value={watchedItems[index]?.specs?.drone?.hours ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? '' : (parseInt(raw) ?? 4);
                                    const currentSpecs = watchedItems[index]?.specs || {};
                                    const updated = {
                                      ...currentSpecs,
                                      drone: { ...currentSpecs.drone, hours: val }
                                    };
                                    setValue(`items.${index}.specs`, updated);
                                    syncDescription(updated);
                                  }}
                                />
                              </div>
                            )}

                            {/* Custom Deliverables Fields */}
                            {(watchedItems[index]?.specs?.customDeliverables || []).map((cust, cIdx) => {
                              if (!cust.selected) return null;
                              return (
                                <div key={cIdx} className="border border-white/5 p-4 rounded-xl bg-black/10 space-y-3 animate-in fade-in duration-200 relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const customList = (currentSpecs.customDeliverables || []).filter((_, i) => i !== cIdx);
                                      const updated = { ...currentSpecs, customDeliverables: customList };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                    className="absolute top-2 right-2 text-slate-500 hover:text-rose-450 p-1 rounded hover:bg-white/5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  <div className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                                    Custom Service Details
                                  </div>

                                  <Input
                                    label="Service Name"
                                    placeholder="e.g. LED Screen, Crane Shot"
                                    value={cust.name || ''}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const customList = [...(currentSpecs.customDeliverables || [])];
                                      customList[cIdx] = { ...customList[cIdx], name: e.target.value };
                                      const updated = { ...currentSpecs, customDeliverables: customList };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                  />

                                  <Input
                                    label="Deliverable Notes/Specs"
                                    placeholder="e.g. 12x8 ft, Dual Output"
                                    value={cust.notes || ''}
                                    onChange={(e) => {
                                      const currentSpecs = watchedItems[index]?.specs || {};
                                      const customList = [...(currentSpecs.customDeliverables || [])];
                                      customList[cIdx] = { ...customList[cIdx], notes: e.target.value };
                                      const updated = { ...currentSpecs, customDeliverables: customList };
                                      setValue(`items.${index}.specs`, updated);
                                      syncDescription(updated);
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Step 4: Payment Summary */}
        {step === 4 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-brand-light" />
                <span>Payment Summary & Token Advance</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-200">
              <div className="space-y-5">
                <Input
                  {...register('discount')}
                  type="number"
                  label="Discount Amount (₹)"
                  placeholder="0.00"
                  error={errors.discount?.message}
                />

                <Input
                  {...register('tokenAmount')}
                  type="number"
                  label="Token Amount / Advance Collected (₹)"
                  placeholder="0.00"
                  error={errors.tokenAmount?.message}
                />

                <Select
                  {...register('paymentMode')}
                  label="Payment Mode *"
                  options={[
                    { label: 'UPI / PhonePe', value: 'UPI' },
                    { label: 'Cash Payment', value: 'Cash' },
                    { label: 'QR Scan code', value: 'QR' },
                  ]}
                  error={errors.paymentMode?.message}
                />
              </div>

              <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-4 font-sans self-center">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Discount Applied:</span>
                  <span className="font-semibold text-rose-450">-{formatCurrency(watchedDiscount)}</span>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between text-sm text-slate-400">
                  <span>Grand Total:</span>
                  <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Token Advance Paid:</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(watchedTokenAmount)}</span>
                </div>
                <div className="border-t border-white/5 pt-3.5 flex justify-between text-base font-bold text-white">
                  <span>Remaining Balance:</span>
                  <span className="text-xl text-brand-light font-extrabold">{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 5: Preview & Generate Invoice */}
        {step === 5 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-brand-light" />
                <span>Verify Event Booking Preview</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
                <h4 className="font-bold text-brand-light uppercase text-xs">Customer Profile</h4>
                <p><span className="text-slate-400 font-medium">Name:</span> {watch('customerName')}</p>
                <p><span className="text-slate-400 font-medium">Phone:</span> {watch('customerPhone')}</p>
                <p><span className="text-slate-400 font-medium">Address:</span> {watch('customerAddress')}, {watch('customerCity')}</p>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
                <h4 className="font-bold text-brand-light uppercase text-xs">Event Specifications</h4>
                <p><span className="text-slate-400 font-medium">Type:</span> {watch('eventType')}</p>
                <p><span className="text-slate-400 font-medium">Date:</span> {watch('eventDate')} @ {watch('eventTime')}</p>
                <p><span className="text-slate-400 font-medium">Location:</span> {watch('eventLocation')}</p>
              </div>
            </div>

            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <h4 className="font-bold text-brand-light uppercase text-xs mb-3">Selected Services</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 font-semibold pb-2">
                      <th className="pb-2">Service</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {watchedItems.map((item, idx) => (
                      <tr key={idx} className="text-slate-350">
                        <td className="py-2.5 font-medium">{item.serviceName}</td>
                        <td className="py-2.5 text-center">{item.quantity}</td>
                        <td className="py-2.5 text-right font-sans">{formatCurrency(item.price)}</td>
                        <td className="py-2.5 text-right font-bold text-slate-200 font-sans">
                          {formatCurrency(item.quantity * item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-tr from-brand-dark/20 to-brand/10 border border-brand-light/10 rounded-2xl flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm font-sans space-y-1">
                <p className="text-slate-400 font-semibold">Total Amount: {formatCurrency(totalAmount)}</p>
                <p className="text-emerald-400 font-extrabold">Advance Paid: {formatCurrency(watchedTokenAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Remaining Balance Due</p>
                <p className="text-2xl font-extrabold text-white mt-1 font-sans">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stepper Navigation buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={step === 1 ? () => navigate('/invoices') : handlePrevStep}
            disabled={mutation.isPending}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 5 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="flex items-center space-x-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              isLoading={mutation.isPending}
              className="flex items-center space-x-1.5 shadow shadow-brand/20"
            >
              <span>Confirm & Generate Booking</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import Login from '../pages/auth/Login';
import DashboardLayout from '../components/layout/DashboardLayout';

// Pages stubs (to be written shortly)
import Dashboard from '../pages/dashboard/Dashboard';
import Customers from '../pages/customers/Customers';
import AddCustomer from '../pages/customers/AddCustomer';
import EditCustomer from '../pages/customers/EditCustomer';
import CustomerTrash from '../pages/customers/CustomerTrash';
import Invoices from '../pages/invoices/Invoices';
import CreateInvoice from '../pages/invoices/CreateInvoice';
import InvoiceDetails from '../pages/invoices/InvoiceDetails';
import InvoiceTrash from '../pages/invoices/InvoiceTrash';
import Payments from '../pages/payments/Payments';
import CompanySettings from '../pages/settings/CompanySettings';
import Profile from '../pages/settings/Profile';
import BackupManagement from '../pages/settings/BackupManagement';
import Services from '../pages/services/Services';
import Templates from '../pages/templates/Templates';
import BookingsList from '../pages/bookings/BookingsList';
import BookingWizard from '../pages/bookings/BookingWizard';
import ProductionBoard from '../pages/production/ProductionBoard';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Layout Routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/add" element={<AddCustomer />} />
          <Route path="/customers/edit/:id" element={<EditCustomer />} />
          <Route path="/customers/trash" element={<CustomerTrash />} />
          <Route path="/bookings" element={<BookingsList />} />
          <Route path="/bookings/new" element={<BookingWizard />} />
          <Route path="/production" element={<ProductionBoard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/create" element={<CreateInvoice />} />
          <Route path="/invoices/details/:id" element={<InvoiceDetails />} />
          <Route path="/invoices/trash" element={<InvoiceTrash />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/services" element={<Services />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Navigate to="/settings/company" replace />} />
          <Route path="/settings/company" element={<CompanySettings />} />
          <Route path="/settings/profile" element={<Profile />} />
          <Route path="/settings/backup" element={<BackupManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

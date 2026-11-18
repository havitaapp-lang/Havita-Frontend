import React from 'react';
import { SecurityIntercom } from '../security/SecurityIntercom';

/**
 * Admin Intercom view for community administrators.
 * Reuses the comprehensive real-time digital citofonía interface (directory & call history).
 */
export const AdminIntercom: React.FC = () => {
  return <SecurityIntercom />;
};

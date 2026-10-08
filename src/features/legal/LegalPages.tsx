import React from 'react';
import { LegalDocumentViewer } from './LegalDocumentViewer';

export const TermsPage: React.FC = () => {
  return <LegalDocumentViewer documentUrl="/legal/terms_v1.0.md" />;
};

export const PrivacyPage: React.FC = () => {
  return <LegalDocumentViewer documentUrl="/legal/privacy_v1.0.md" />;
};

export const SecurityPage: React.FC = () => {
  return <LegalDocumentViewer documentUrl="/legal/security_v1.0.md" />;
};

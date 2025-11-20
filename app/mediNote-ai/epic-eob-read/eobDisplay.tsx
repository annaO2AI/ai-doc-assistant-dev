import React from 'react';
import { EOBData } from '../types';


// Reusable Section Component
const Section = ({ 
  title, 
  children, 
  className = "" 
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

// Reusable Info Row Component
const InfoRow = ({ 
  label, 
  value, 
  valueClassName = "" 
}: { 
  label: string; 
  value: string | number; 
  valueClassName?: string;
}) => (
  <div className="flex justify-between items-start">
    <span className="text-sm font-medium text-gray-600 flex-shrink-0 mr-4">{label}:</span>
    <span className={`text-sm text-gray-900 text-right flex-1 ${valueClassName}`}>
      {value}
    </span>
  </div>
);

export const EOBDisplay = ({ eobData }: { eobData: EOBData }) => {
  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Find specific totals
  const benefitAmount = eobData.total.find(t => 
    t.category.coding.some(c => c.code === "benefit")
  )?.amount.value || 0;

  const copayAmount = eobData.total.find(t => 
    t.category.coding.some(c => c.code === "copay")
  )?.amount.value || 0;

  const submittedAmount = eobData.total.find(t => 
    t.category.coding.some(c => c.code === "submitted")
  )?.amount.value || 0;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Explanation of Benefits</h1>
        <p className="text-gray-600">Claim ID: {eobData.id}</p>
        <div className="flex gap-4 mt-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            eobData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            Status: {eobData.status}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Type: {eobData.type.coding[0].display}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Patient Information */}
          <Section title="Patient Information">
            <InfoRow label="Name" value={eobData.patient.display} />
            <InfoRow label="Patient ID" value={eobData.patient.reference.split('/')[1]} />
          </Section>

          {/* Provider Information */}
          <Section title="Provider Information">
            <InfoRow label="Provider Name" value={eobData.provider.display} />
            <InfoRow label="NPI" value={eobData.provider.identifier.value} />
            <InfoRow label="Type" value={eobData.provider.type} />
          </Section>

          {/* Insurer */}
          <Section title="Insurer">
            <InfoRow label="Insurance Company" value={eobData.insurer.display} />
            <InfoRow label="Payer ID" value={eobData.insurer.identifier.value} />
          </Section>

          {/* Billable Period */}
          <Section title="Billable Period">
            <InfoRow label="Start Date" value={formatDate(eobData.billablePeriod.start)} />
            <InfoRow label="End Date" value={formatDate(eobData.billablePeriod.end)} />
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Outcome & Disposition */}
          <Section title="Outcome & Disposition">
            <InfoRow label="Outcome" value={eobData.outcome} />
            <InfoRow label="Disposition" value={eobData.disposition} />
          </Section>

          {/* Diagnosis */}
          <Section title="Diagnosis">
            {eobData.diagnosis.map((diagnosis, index) => (
              <div key={index} className="space-y-1">
                <InfoRow 
                  label={`Diagnosis ${diagnosis.sequence}`} 
                  value={diagnosis.diagnosisCodeableConcept.coding[0].display} 
                />
                <div className="text-sm text-gray-600 ml-4">
                  Code: {diagnosis.diagnosisCodeableConcept.coding[0].code}
                </div>
              </div>
            ))}
          </Section>

          {/* Care Team */}
          <Section title="Care Team">
            {eobData.careTeam.map((member, index) => (
              <div key={index} className="space-y-1 border-l-2 border-blue-200 pl-3">
                <InfoRow label="Provider" value={member.provider.display} />
                <InfoRow label="NPI" value={member.provider.identifier.value} />
                <InfoRow label="Role" value={member.role.coding[0].display} />
                <InfoRow label="Responsible" value={member.responsible ? "Yes" : "No"} />
              </div>
            ))}
          </Section>
        </div>
      </div>

      {/* Procedures / Services */}
      <Section title="Procedures / Services" className="mt-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Responsibility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contractual Obligation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eobData.item.map((item, index) => {
                const patientResponsibility = item.adjudication.find(a => 
                  a.category.coding.some(c => c.code === "PR")
                )?.amount.value || 0;

                const contractualObligation = item.adjudication.find(a => 
                  a.category.coding.some(c => c.code === "CO")
                )?.amount.value || 0;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.productOrService.coding[0].code}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.productOrService.coding[0].display}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.locationCodeableConcept.coding[0].display}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity.value} {item.quantity.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.net.value, item.net.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                      {formatCurrency(patientResponsibility, "USD")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(contractualObligation, "USD")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Payment Information & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Payment Information */}
        <Section title="Payment Information">
          <InfoRow label="Payment Date" value={formatDate(eobData.payment.date)} />
          <InfoRow 
            label="Paid Amount" 
            value={formatCurrency(eobData.payment.amount.value, eobData.payment.amount.currency)}
            valueClassName="text-green-600 font-bold text-lg"
          />
        </Section>

        {/* Totals */}
        <Section title="Totals">
          <InfoRow 
            label="Benefit Amount" 
            value={formatCurrency(benefitAmount, "USD")}
          />
          <InfoRow 
            label="Copay" 
            value={formatCurrency(copayAmount, "USD")}
          />
          <InfoRow 
            label="Submitted Amount" 
            value={formatCurrency(submittedAmount, "USD")}
          />
          <div className="border-t border-gray-200 mt-3 pt-3">
            <InfoRow 
              label="Total Patient Responsibility" 
              value={formatCurrency(copayAmount, "USD")}
              valueClassName="text-red-600 font-bold"
            />
          </div>
        </Section>
      </div>
    </div>
  );
};
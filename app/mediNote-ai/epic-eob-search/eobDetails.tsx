import { EOBEntry } from "../types";

interface EOBDetailsProps {
  eobEntry: EOBEntry;
  onBack: () => void;
}

export default function EOBDetails({ eobEntry, onBack }: EOBDetailsProps) {
  const { resource } = eobEntry;

  return (
    <div className="container mx-auto p-6">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        ← Back to List
      </button>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold ">
            EOB Details - {resource.id}
          </h1>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Status</label>
                <p className="mt-1 text-sm text-gray-900">{resource.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Type</label>
                <p className="mt-1 text-sm text-gray-900">
                  {resource.type.coding[0]?.display}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Use</label>
                <p className="mt-1 text-sm text-gray-900">{resource.use}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(resource.created).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Outcome</label>
                <p className="mt-1 text-sm text-gray-900">{resource.outcome}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Disposition</label>
                <p className="mt-1 text-sm text-gray-900">{resource.disposition}</p>
              </div>
            </div>
          </section>

          {/* Patient Information */}
          {/* <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Patient</label>
                <p className="mt-1 text-sm text-gray-900">{resource.patient.display}</p>
              </div>
            </div>
          </section> */}

          {/* Insurance Information */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Insurer</label>
                <p className="mt-1 text-sm text-gray-900">{resource.insurer.display}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Provider</label>
                <p className="mt-1 text-sm text-gray-900">{resource.provider.display}</p>
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-600">Billable Period</label>
                <p className="mt-1 text-sm text-gray-900">
                  {resource.billablePeriod.start} to {resource.billablePeriod.end}
                </p>
              </div>
            </div>
          </section>

          {/* Payment Information */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Payment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-green-800">Total Paid</label>
                <p className="mt-1 text-xl font-bold text-green-900">
                  ${resource.payment.amount.value} {resource.payment.amount.currency}
                </p>
                <p className="text-sm text-green-700">Date: {resource.payment.date}</p>
              </div>
              {resource.total.map((total : any, index : any) => (
                <div key={index} className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-800">
                    {total.category.coding[0]?.display}
                  </label>
                  <p className="mt-1 text-lg font-semibold text-blue-900">
                    ${total.amount.value} {total.amount.currency}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Items */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Service Items</h2>
            {resource.item.map((item : any, index : any) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Service</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {item.productOrService.coding[0]?.display}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Service Period</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {item.servicedPeriod.start} to {item.servicedPeriod.end}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Net Amount</label>
                    <p className="mt-1 text-sm text-gray-900">
                      ${item.net.value} {item.net.currency}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Location</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {item.locationCodeableConcept.coding[0]?.display}
                    </p>
                  </div>
                </div>
                
                {/* Adjudication Details */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Adjudication</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.adjudication.map((adj : any, adjIndex : any) => (
                      <div key={adjIndex} className="bg-gray-50 p-2 rounded">
                        <span className="text-sm font-medium text-gray-700">
                          {adj.category.coding[0]?.display}:
                        </span>
                        <span className="text-sm text-gray-900 ml-2">
                          ${adj.amount.value} {adj.amount.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Care Team */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Care Team</h2>
            <div className="space-y-2">
              {resource.careTeam.map((member : any, index : any) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{member.provider.display}</p>
                    <p className="text-sm text-gray-600">{member.role.coding[0]?.display}</p>
                  </div>
                  {member.responsible && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Responsible
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
'use client';

interface Service {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

interface ServiceCardProps {
  service: Service;
  onSelect: (serviceId: string) => void;
}

export default function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <div
      onClick={() => onSelect(service.id)}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform duration-200`}>
          {service.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
            {service.title}
          </h3>
          <p className="text-sm text-blue-600 font-medium">
            {service.subtitle}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {service.description}
          </p>
        </div>
        <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

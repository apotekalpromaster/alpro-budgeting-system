import React from 'react';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterDropdownProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: FilterOption[];
    id: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, value, onChange, options, id }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
                {label}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={onChange}
                    className="appearance-none w-full p-2.5 pr-8 border border-border-color bg-surface text-text-primary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary-light transition-all"
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default FilterDropdown;

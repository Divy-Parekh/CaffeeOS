import React from 'react';

export const Tabs = ({
    tabs,
    activeTab,
    onChange,
    variant = 'underline',
    fullWidth = false,
}) => {
    if (variant === 'pills') {
        return (
            <div className={`flex gap-2 ${fullWidth ? 'w-full' : ''}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-full font-medium
              transition-all duration-150
              ${fullWidth ? 'flex-1 justify-center' : ''}
              ${activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                            }
            `}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-white/20' : 'bg-dark-600'}
              `}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    if (variant === 'boxed') {
        return (
            <div className={`flex bg-dark-800 rounded-lg p-1 gap-1 ${fullWidth ? 'w-full' : 'inline-flex'}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium
              transition-all duration-150
              ${fullWidth ? 'flex-1 justify-center' : ''}
              ${activeTab === tab.id
                                ? 'bg-dark-600 text-white shadow'
                                : 'text-gray-400 hover:text-white'
                            }
            `}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className="px-2 py-0.5 text-xs bg-dark-700 rounded-full">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // Default: underline
    return (
        <div className={`flex border-b border-dark-600 ${fullWidth ? 'w-full' : ''}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
            flex items-center gap-2 px-4 py-3 font-medium
            border-b-2 -mb-px transition-all duration-150
            ${fullWidth ? 'flex-1 justify-center' : ''}
            ${activeTab === tab.id
                            ? 'border-primary text-white'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                        }
          `}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`
              px-2 py-0.5 text-xs rounded-full
              ${activeTab === tab.id ? 'bg-primary/20 text-primary-light' : 'bg-dark-700'}
            `}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default Tabs;

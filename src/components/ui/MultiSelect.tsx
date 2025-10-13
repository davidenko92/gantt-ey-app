import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { User } from '@types';

interface MultiSelectProps {
  options: User[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (userName: string) => {
    if (selected.includes(userName)) {
      onChange(selected.filter((u) => u !== userName));
    } else {
      onChange([...selected, userName]);
    }
  };

  const handleRemove = (userName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((u) => u !== userName));
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 border-2 rounded-lg
          ${sizeClasses[size]}
          ${
            disabled
              ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200'
              : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
          }
          transition-colors
        `}
      >
        <span className="truncate text-left flex-1">
          {selected.length === 0
            ? placeholder
            : `${selected.length} seleccionado${selected.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown
          size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
          className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 italic text-center">
              No hay usuarios disponibles
            </div>
          ) : (
            <div className="py-1">
              {options.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(user.name)}
                    onChange={() => handleToggle(user.name)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span
                      className={`
                        text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0
                        ${user.category === 'Senior' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                      `}
                    >
                      {user.category}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((userName) => {
            const user = options.find((u) => u.name === userName);
            if (!user) return null;

            return (
              <div
                key={userName}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: user.color + '20',
                  color: user.color,
                  border: `1px solid ${user.color}40`,
                }}
              >
                <span className="truncate max-w-[120px]">{userName.split(' ')[0]}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(userName, e)}
                  className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                  aria-label={`Remover ${userName}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

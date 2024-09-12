import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement>;
}

export const Popover: React.FC<PopoverProps> = ({ isOpen, onClose, title, children, triggerRef }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      
      const top = triggerRect.bottom + window.scrollY;
      const left = triggerRect.left + window.scrollX - (popoverRect.width / 2) + (triggerRect.width / 2);

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
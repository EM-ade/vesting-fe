"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className = "",
}: MultiSelectProps) {
  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <Popover className={`relative ${className}`}>
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              flex min-h-[38px] w-full items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white/90 shadow-sm transition-all hover:border-white/20 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500/50
              ${open ? "border-purple-500/50 ring-2 ring-purple-500/20" : ""}
            `}
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 && (
                <span className="text-white/40">{placeholder}</span>
              )}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedLabels.slice(0, 2).map((label, i) => (
                    <span
                      key={selected[i]}
                      className="inline-flex items-center rounded bg-purple-500/20 px-1.5 py-0.5 text-xs font-medium text-purple-200"
                    >
                      {label}
                      <button
                        onClick={(e) => handleRemove(selected[i], e)}
                        className="ml-1 rounded-full p-0.5 hover:bg-purple-500/30"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selected.length > 2 && (
                    <span className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/70">
                      +{selected.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Popover.Panel className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl ring-1 ring-black/5 focus:outline-none">
              <div className="p-1">
                {options.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-white/40">
                    No items found.
                  </div>
                ) : (
                  options.map((option) => (
                    <div
                      key={option.value}
                      className={`
                        flex cursor-pointer items-center justify-between rounded px-2 py-2 text-sm transition-colors
                        ${
                          selected.includes(option.value)
                            ? "bg-purple-500/20 text-purple-200"
                            : "text-white/80 hover:bg-white/5 hover:text-white"
                        }
                      `}
                      onClick={() => handleToggle(option.value)}
                    >
                      <span className="block truncate">{option.label}</span>
                      {selected.includes(option.value) && (
                        <Check className="h-4 w-4 shrink-0 text-purple-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

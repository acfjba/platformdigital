// src/components/shared/cluster-year-select.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ClusterYearSelectProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
}

const standardYears = ['Kindergarten', ...Array.from({ length: 8 }, (_, i) => `Year ${i + 1}`)];
const OTHER_OPTION = 'Other';

export function ClusterYearSelect({ id, value, onValueChange }: ClusterYearSelectProps) {
  const isCustomValue = value && !standardYears.includes(value) && value !== OTHER_OPTION;
  
  const [showCustomInput, setShowCustomInput] = useState(isCustomValue);
  const [selectValue, setSelectValue] = useState(isCustomValue ? OTHER_OPTION : value);
  const [customValue, setCustomValue] = useState(isCustomValue ? value : '');

  useEffect(() => {
    const isCustom = value && !standardYears.includes(value) && value !== OTHER_OPTION;
    setShowCustomInput(isCustom);
    setSelectValue(isCustom ? OTHER_OPTION : value);
    setCustomValue(isCustom ? value : '');
  }, [value]);


  const handleSelectChange = (newValue: string) => {
    setSelectValue(newValue);
    if (newValue === OTHER_OPTION) {
      setShowCustomInput(true);
      // If they switch to "Other", but had a standard year before, we don't want to call onValueChange yet.
      // We wait for them to type something. If they had a custom value, we keep it.
      if(customValue) {
        onValueChange(customValue)
      }
    } else {
      setShowCustomInput(false);
      setCustomValue(''); // Clear custom input if a standard year is selected
      onValueChange(newValue);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value);
    onValueChange(e.target.value);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select a year level" />
        </SelectTrigger>
        <SelectContent>
          {standardYears.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_OPTION}>Other...</SelectItem>
        </SelectContent>
      </Select>
      {showCustomInput && (
        <Input
          type="text"
          placeholder="Enter custom cluster name"
          value={customValue}
          onChange={handleCustomInputChange}
          className="mt-2"
        />
      )}
    </div>
  );
}

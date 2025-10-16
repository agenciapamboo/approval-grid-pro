import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [hours, minutes] = value.split(':').map(Number);

  const incrementHours = () => {
    const newHours = (hours + 1) % 24;
    onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  const decrementHours = () => {
    const newHours = hours === 0 ? 23 : hours - 1;
    onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  const incrementMinutes = () => {
    const newMinutes = (minutes + 5) % 60;
    onChange(`${String(hours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };

  const decrementMinutes = () => {
    const newMinutes = minutes === 0 ? 55 : Math.floor((minutes - 5) / 5) * 5;
    onChange(`${String(hours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={incrementHours}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <div className="text-2xl font-semibold w-12 text-center">
          {String(hours).padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={decrementHours}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      
      <span className="text-2xl font-semibold">:</span>
      
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={incrementMinutes}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <div className="text-2xl font-semibold w-12 text-center">
          {String(minutes).padStart(2, '0')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={decrementMinutes}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

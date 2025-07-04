'use client'

import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { forwardRef, useState, useEffect } from 'react'
import { Input } from './input'
import { djs } from 'faktorio-shared/src/djs'

export const DatePicker = forwardRef<
  HTMLDivElement,
  {
    date?: Date
    setDate: (date?: Date) => void
  }
>(function DatePickerCmp({ date, setDate }, ref) {
  const djsDate = djs(date)
  const [inputValue, setInputValue] = useState(
    date ? djsDate.format('YYYY-MM-DD') : ''
  )
  const [isInvalid, setIsInvalid] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(date)

  useEffect(() => {
    setInputValue(date ? djsDate.format('YYYY-MM-DD') : '')
    setIsInvalid(false)
    setCalendarMonth(date)
  }, [date])

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const value = e.target.value
          setInputValue(value)

          if (!value) {
            setDate(undefined)
            setIsInvalid(false)
            setCalendarMonth(undefined)
            return
          }

          if (value.length !== 10) {
            setIsInvalid(true)
            return
          }

          const parsed = djs(value)
          const valid = parsed.isValid()
          setIsInvalid(!valid)

          if (valid) {
            const date = parsed.toDate()
            setDate(date)
            setCalendarMonth(date)
          }
        }}
        className={cn(isInvalid && 'border-red-500 focus-visible:ring-red-500')}
        placeholder="YYYY-MM-DD"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn('px-3', !date && 'text-muted-foreground')}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" ref={ref}>
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={calendarMonth}
            onSelect={(newDate) => {
              setDate(newDate)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
})

import React from "react";

import { cn } from "@/lib/utils";


import cc from 'currency-codes'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// radix-ui
import { SelectProps } from "@radix-ui/react-select";

// types
export interface Currency {
  code: string;
  decimals: number;
  name: string;
  number: string;
  symbol?: string;
}



interface CurrencySelectProps extends Omit<SelectProps, "onValueChange"> {
  onChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  name: string;
  placeholder?: string;
  currencyCodes?: string[];
  variant?: "default" | "small";
  valid?: boolean;
}

// function formatCountriesForCurrency(code: string): string {
//   const currency = cc.code(code);

//   if (code === "EUR") {
//     return "Eurozone";
//   } else if (code === "USD") {
//     return "United States";
//   } else if (code === "GBP") {
//     return "United Kingdom";
//   }
//   if (currency && currency.countries) {
//     return currency.countries.join(", ").substring(0, 100);
//   }


//   return "";
// }

const CurrencySelect = React.forwardRef<HTMLButtonElement, CurrencySelectProps>(
  (
    {
      value,
      onChange: onValueChange,
      onCurrencySelect,
      name,
      placeholder = "Select currency",
      currencyCodes = [],
      variant = "default",
      valid = true,
      ...props
    },
    ref
  ) => {
    const [selectedCurrency, setSelectedCurrency] =
      React.useState<Currency | null>(null);

    const sortCurrencies = (currencies: Currency[]) => {
      return currencies.sort((a, b) => {
        const priorityCurrencies = ['CZK', 'EUR', 'USD', 'GBP'];
        const aIndex = priorityCurrencies.indexOf(a.code);
        const bIndex = priorityCurrencies.indexOf(b.code);

        // If both are priority currencies, sort by their priority order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only a is priority, it comes first
        if (aIndex !== -1) return -1;
        // If only b is priority, it comes first
        if (bIndex !== -1) return 1;
        // If neither is priority, sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
    };

    const uniqueCurrencies = React.useMemo<Currency[]>(() => {
      if (currencyCodes.length > 0) {
        // Use provided currency options
        const currencyMap = new Map<string, Currency>();

        currencyCodes.forEach((currencyCode) => {
          // Find the full currency data from AllCurrencies
          const fullCurrency = cc.code(currencyCode);

          if (fullCurrency && fullCurrency.code) {
            currencyMap.set(fullCurrency.code, {
              code: fullCurrency.code,
              name: fullCurrency.currency,
              symbol: fullCurrency.code, // Use code as symbol since currency-codes doesn't provide symbols
              decimals: fullCurrency.digits,
              number: fullCurrency.number,
            });
          }
        });

        return sortCurrencies(Array.from(currencyMap.values()));
      }

      // Fallback to all currencies if no options provided
      const currencyMap = new Map<string, Currency>();

      cc.data.filter((currency) => {
        // Filter out any currencies that do not have a code
        return !currency.countries[0].startsWith('Zz')
      }).map((currency) => {
        if (currency.code) {
          currencyMap.set(currency.code, {
            code: currency.code,
            name: currency.currency,
            symbol: currency.code, // Use code as symbol since currency-codes doesn't provide symbols
            decimals: currency.digits,
            number: currency.number,
          });
        }
      })

      return sortCurrencies(Array.from(currencyMap.values()));
    }, [currencyCodes]);

    const handleValueChange = (newValue: string) => {
      const fullCurrencyData = uniqueCurrencies.find(
        (curr) => curr.code === newValue
      );
      console.log("Selected currency:", fullCurrencyData, "Value:", newValue);
      if (fullCurrencyData) {
        setSelectedCurrency(fullCurrencyData);
        if (onValueChange) {
          onValueChange(newValue);
        }
        if (onCurrencySelect) {
          onCurrencySelect(fullCurrencyData);
        }
      }
    };

    void selectedCurrency;

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        {...props}
        name={name}
        data-valid={valid}
      >
        <SelectTrigger
          className={cn("w-full", variant === "small" && "w-fit gap-2")}
          data-valid={valid}
          ref={ref}
        >
          {value && variant === "small" ? (
            <SelectValue placeholder={placeholder}>
              <span>{value}</span>
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {uniqueCurrencies.map((currency) => (
              <SelectItem key={currency?.code} value={currency?.code || ""}>
                <div className="flex items-center w-full gap-2">
                  <span className="text-sm text-muted-foreground w-8 text-left">
                    {currency?.code}
                  </span>
                  <span className="hidden">{currency?.symbol}</span>
                  <span>{currency?.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
);

CurrencySelect.displayName = "CurrencySelect";

export { CurrencySelect };
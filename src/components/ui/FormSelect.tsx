import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { TextField, MenuItem } from "@mui/material";

interface SelectOption {
  value: string | number;
  label: string;
}

interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  rules?: Record<string, any>;
  fullWidth?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
}

export default function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  rules,
  fullWidth = true,
  disabled = false,
  size = "small",
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          label={label}
          fullWidth={fullWidth}
          disabled={disabled}
          size={size}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

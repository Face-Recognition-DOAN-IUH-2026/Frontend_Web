import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { TextField, SxProps } from "@mui/material";

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  rules?: Record<string, any>;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: string;
  multiline?: boolean;
  rows?: number;
  size?: "small" | "medium";
  sx?: SxProps;
}

export default function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  rules,
  fullWidth = true,
  disabled = false,
  type,
  multiline,
  rows,
  size = "small",
  sx,
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          type={type}
          fullWidth={fullWidth}
          disabled={disabled}
          multiline={multiline}
          rows={rows}
          size={size}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 }, ...sx }}
        />
      )}
    />
  );
}

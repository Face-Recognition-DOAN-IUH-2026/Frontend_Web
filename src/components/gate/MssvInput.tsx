'use client';

import { useState, KeyboardEvent } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface MssvInputProps {
  onSubmit: (mssv: string) => void;
  disabled?: boolean;
}

export default function MssvInput({ onSubmit, disabled }: MssvInputProps) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <TextField
      fullWidth
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder="Nhập MSSV..."
      variant="outlined"
      sx={{
        "& .MuiInputBase-root": {
          fontSize: "1.1rem",
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          textAlign: "center",
          bgcolor: "rgba(30,41,59,0.8)",
          borderRadius: 3,
          "& fieldset": { borderColor: "grey.600" },
          "&:hover fieldset": { borderColor: "primary.main" },
          "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 2 },
        },
        "& .MuiInputBase-input": { textAlign: "center", py: "16px" },
      }}
      slotProps={{
        input: {
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                onClick={() => onSubmit(value.trim())}
                disabled={disabled}
                color="primary"
                sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" }, p: 1 }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}

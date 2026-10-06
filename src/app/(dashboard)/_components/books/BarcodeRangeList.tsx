"use client";

import React, { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Collapse from "@mui/material/Collapse";

interface BarcodeRangeListProps {
  barcodes?: string[];
}

function parseBarcodeSequence(barcodes: string[]) {
  if (!barcodes || barcodes.length === 0) return null;
  if (barcodes.length === 1) return { single: barcodes[0] };

  const matchFirst = barcodes[0].match(/^(.*-)(\d+)$/);
  const matchLast = barcodes[barcodes.length - 1].match(/^(.*-)(\d+)$/);

  if (matchFirst && matchLast && matchFirst[1] === matchLast[1]) {
    const prefix = matchFirst[1];
    const firstSeq = parseInt(matchFirst[2], 10);
    const lastSeq = parseInt(matchLast[2], 10);

    // Check if contiguous
    let isContiguous = true;
    for (let i = 0; i < barcodes.length; i++) {
      const m = barcodes[i].match(/^(.*-)(\d+)$/);
      if (!m || m[1] !== prefix || parseInt(m[2], 10) !== firstSeq + i) {
        isContiguous = false;
        break;
      }
    }

    if (isContiguous) {
      return {
        isContiguous: true,
        summary: `${barcodes[0]} → ${matchLast[2]}`,
        count: barcodes.length,
      };
    }
  }

  return {
    isContiguous: false,
    summary: `${barcodes[0]}...`,
    count: barcodes.length,
  };
}

export function BarcodeRangeList({ barcodes }: BarcodeRangeListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!barcodes || barcodes.length === 0) {
    return <Typography component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary" }}>-</Typography>;
  }

  if (barcodes.length === 1) {
    return (
      <Typography component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.875rem" }}>
        {barcodes[0]}
      </Typography>
    );
  }

  const parsed = parseBarcodeSequence(barcodes);

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", gap: 0.5 }}>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {parsed?.summary}
        </Typography>
        <Chip
          size="small"
          label={`${barcodes.length} mã`}
          color="primary"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
            fontSize: "0.75rem",
            height: 20,
            "&:hover": { bgcolor: "action.hover" },
          }}
        />
      </Box>

      {expanded && (
        <Box
          data-testid="barcode-expanded-list"
          sx={{
            mt: 0.5,
            p: 1,
            maxHeight: 160,
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
          }}
        >
          {barcodes.map((code) => (
            <Box key={code} sx={{ py: 0.25 }}>
              {code}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default BarcodeRangeList;

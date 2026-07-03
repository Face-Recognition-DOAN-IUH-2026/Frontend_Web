export interface ScannedCardData {
  studentCode: string;
  fullName: string;
  className: string | null;
  dateOfBirth: string | null;
  course: string | null;
  permanentAddress: string | null;
  faculty: string | null;
  rawText: string;
}

/**
 * Parse raw OCR text into structured card data using the backend LLM endpoint.
 *
 * This replaces the previous regex-based parsing with an LLM-powered extraction
 * that handles variations in card layout, OCR errors, and damaged cards.
 *
 * The backend uses OpenRouter (GPT-4.1-mini) to extract structured fields
 * from the raw OCR text, then returns the parsed result.
 *
 * @param rawText - The raw text output from Tesseract OCR
 * @returns Parsed card data with extracted fields
 */
export async function parseCardText(rawText: string): Promise<Partial<ScannedCardData>> {
  if (!rawText || rawText.trim().length === 0) {
    return { rawText: rawText || "" };
  }

  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
    const token = typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
      : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/ai/parse-card-text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ raw_text: rawText }),
    });

    if (!response.ok) {
      // Fallback: return raw text without parsed fields
      console.warn(`Card parsing API failed: ${response.status}`);
      return { rawText };
    }

    const parsed = await response.json();

    return {
      studentCode: parsed.student_code || "",
      fullName: parsed.full_name || "",
      className: parsed.class_name || null,
      dateOfBirth: parsed.date_of_birth || null,
      course: parsed.course || null,
      permanentAddress: parsed.permanent_address || null,
      faculty: parsed.faculty || null,
      rawText,
    };
  } catch (err) {
    console.warn("Card parsing failed, returning raw text:", err);
    return { rawText };
  }
}

import { AxiosInstance } from 'axios';
import {
  BorrowResponse,
  ReturnResponse,
  StaffReturnRequest,
  StaffActiveBorrowersResponse,
  StaffPatronActiveBorrowsResponse,
  BorrowRecord,
  CreateBorrowSlipRequest,
  CreateBorrowSlipResponse,
  LookupBorrowSlipRequest,
  LookupBorrowSlipResponse,
  ConfirmBorrowSlipRequest,
} from '../types';

export function createBorrowMethods(client: AxiosInstance) {
  return {
    async borrowBook(barcode: string): Promise<BorrowResponse> {
      const response = await client.post<BorrowResponse>("/api/borrow/", { barcode });
      return response.data;
    },

    async staffReturnBook(barcode: string, note?: string | null): Promise<ReturnResponse> {
      const response = await client.post<ReturnResponse>("/api/borrow/return", { barcode, note } as StaffReturnRequest);
      return response.data;
    },

    async getActiveBorrowers(): Promise<StaffActiveBorrowersResponse> {
      const response = await client.get<StaffActiveBorrowersResponse>("/api/borrow/active-borrowers");
      return response.data;
    },

    async getActiveBorrowsByStudentCode(studentCode: string): Promise<StaffPatronActiveBorrowsResponse> {
      const response = await client.get<StaffPatronActiveBorrowsResponse>(
        `/api/borrow/patrons/${encodeURIComponent(studentCode)}/active`
      );
      return response.data;
    },

    async staffReturnBorrowRecord(recordId: string, note?: string | null): Promise<ReturnResponse> {
      const response = await client.post<ReturnResponse>(`/api/borrow/return/record/${recordId}`, { note });
      return response.data;
    },

    async getBorrowStats(): Promise<{ total: number; active: number; overdue: number }> {
      const response = await client.get("/api/borrow/stats");
      return response.data;
    },

    async getBorrowConfig(): Promise<{ max_borrow_books: number; max_borrow_books_per_slip: number; max_borrow_days: number }> {
      const response = await client.get("/api/borrow/config");
      return response.data;
    },

    async getAllActiveBorrows(): Promise<BorrowRecord[]> {
      const response = await client.get<BorrowRecord[]>("/api/borrow/active");
      return response.data;
    },

    async getBorrowHistory(params?: { patronId?: string; statusFilter?: string }): Promise<BorrowRecord[]> {
      const query: any = {};
      if (params?.statusFilter) query.status_filter = params.statusFilter;
      const endpoint = params?.patronId
        ? `/api/borrow/patrons/id/${params.patronId}/history`
        : "/api/borrow/history";
      const response = await client.get<BorrowRecord[]>(endpoint, { params: query });
      return response.data;
    },

    async lookupBorrowByBarcode(barcode: string): Promise<BorrowRecord | null> {
      try {
        const response = await client.get<BorrowRecord>(`/api/borrow/barcode/${barcode}`);
        return response.data;
      } catch {
        return null;
      }
    },

    async createBorrowSlip(data: CreateBorrowSlipRequest): Promise<CreateBorrowSlipResponse> {
      const response = await client.post<CreateBorrowSlipResponse>("/api/borrow/slip/create", data);
      return response.data;
    },

    async lookupBorrowSlip(data: LookupBorrowSlipRequest): Promise<LookupBorrowSlipResponse> {
      const response = await client.post<LookupBorrowSlipResponse>("/api/borrow/slip/lookup", data);
      return response.data;
    },

    async confirmBorrowSlip(data: ConfirmBorrowSlipRequest): Promise<CreateBorrowSlipResponse> {
      const response = await client.post<CreateBorrowSlipResponse>("/api/borrow/slip/confirm", data);
      return response.data;
    },
  };
}

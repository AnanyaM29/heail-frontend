import { Order } from './order.models';

export interface OrderEmployee {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  level: string;
  invitationStatus: string;
}

export interface OrgOrderResponse {
  order: Order;
  employees: OrderEmployee[];
}

export interface EmployeeRow {
  name: string;
  email: string;
  mobile: string;
  level: string;
}

export interface RowError {
  index: number;
  message: string;
}

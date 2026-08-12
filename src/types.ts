export type Screen =
  | 'dashboard' | 'newOrder' | 'receipt' | 'deliverSearch'
  | 'delivery' | 'pending' | 'customers' | 'customerDetail'
  | 'reports' | 'collections' | 'settings';

export type Order = {
  id:string; customerName:string; mobile:string; address:string;
  orderDate:string; deliveryDate:string;
  items:{name:string;qty:number;rate:number}[];
  total:number; paid:number; balance:number;
  status:'READY'|'DELIVERED';
  paymentMode:'CASH'|'UPI'|'CARD';
};